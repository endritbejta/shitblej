const request = require("supertest");
const app = require("./helpers/api").server;
const db = require("./helpers/db");
const { createUser, createProduct } = require("./helpers/factories");
const { cloudinary } = require("../src/config/cloudinary");
const {
  publicIdFromUrl,
} = require("../src/shared/utils/cloudinaryAssets");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

const CDN = "https://res.cloudinary.com/demo-cloud/image/upload";

describe("publicIdFromUrl", () => {
  it("recovers the id from a plain delivery URL", () => {
    expect(publicIdFromUrl(`${CDN}/v1699999999/shitblej-products/abc123.jpg`))
      .toBe("shitblej-products/abc123");
  });

  it("recovers the id without a version segment", () => {
    expect(publicIdFromUrl(`${CDN}/shitblej-products/abc123.webp`))
      .toBe("shitblej-products/abc123");
  });

  it("strips transformation segments", () => {
    expect(
      publicIdFromUrl(
        `${CDN}/w_1200,h_1200,c_limit/q_auto/v1699999999/shitblej-products/abc123.jpg`
      )
    ).toBe("shitblej-products/abc123");
  });

  it("returns null for anything not hosted on Cloudinary", () => {
    // Seeded fixtures, placeholder avatars and pasted URLs must be left alone
    // rather than have an id guessed out of them.
    expect(publicIdFromUrl("https://example.com/test.jpg")).toBeNull();
    expect(publicIdFromUrl("https://via.placeholder.com/150")).toBeNull();
    expect(publicIdFromUrl(undefined)).toBeNull();
    expect(publicIdFromUrl("")).toBeNull();
  });
});

describe("deleting a listing releases its hosted images", () => {
  let destroySpy;
  beforeEach(() => {
    destroySpy = jest
      .spyOn(cloudinary.uploader, "destroy")
      .mockResolvedValue({ result: "ok" });
  });
  afterEach(() => destroySpy.mockRestore());

  // The cleanup is fire-and-forget so the response never waits on Cloudinary;
  // give the microtask queue a turn before asserting.
  const settle = () => new Promise((resolve) => setImmediate(resolve));

  it("destroys the Cloudinary assets behind the product", async () => {
    const seller = await createUser();
    const product = await createProduct({
      userId: seller.user._id,
      images: [
        `${CDN}/v1699999999/shitblej-products/one.jpg`,
        `${CDN}/v1699999999/shitblej-products/two.jpg`,
      ],
    });

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(res.status).toBe(200);

    await settle();

    expect(destroySpy).toHaveBeenCalledTimes(2);
    const destroyed = destroySpy.mock.calls.map((c) => c[0]).sort();
    expect(destroyed).toEqual([
      "shitblej-products/one",
      "shitblej-products/two",
    ]);
  });

  it("leaves non-Cloudinary images alone", async () => {
    const seller = await createUser();
    const product = await createProduct({
      userId: seller.user._id,
      images: ["https://example.com/seeded.jpg"],
    });

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);
    expect(res.status).toBe(200);

    await settle();
    expect(destroySpy).not.toHaveBeenCalled();
  });

  it("still deletes the listing when Cloudinary is unavailable", async () => {
    destroySpy.mockRejectedValue(new Error("cloudinary unreachable"));

    const seller = await createUser();
    const product = await createProduct({
      userId: seller.user._id,
      images: [`${CDN}/v1/shitblej-products/three.jpg`],
    });

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${seller.token}`);

    // The listing is gone as far as the marketplace is concerned; the orphan
    // is logged for reconciliation, not surfaced as a failed request.
    expect(res.status).toBe(200);
    await settle();
  });
});

describe("a rejected upload does not leave orphans", () => {
  let destroySpy;
  beforeEach(() => {
    destroySpy = jest
      .spyOn(cloudinary.uploader, "destroy")
      .mockResolvedValue({ result: "ok" });
  });
  afterEach(() => destroySpy.mockRestore());

  const cleanupUploads = require("../src/middleware/cleanupUploads");

  // Driven directly: exercising it through the route would mean uploading to
  // Cloudinary for real. What matters is that the middleware releases whatever
  // multer already put on the request when the request then fails.
  it("destroys files attached to a failed request", async () => {
    const req = {
      files: [
        { filename: "shitblej-products/upload-a", path: `${CDN}/a.jpg` },
        { filename: "shitblej-products/upload-b", path: `${CDN}/b.jpg` },
      ],
    };
    const err = new Error("Validation Error: price must be a number");

    const forwarded = await new Promise((resolve) => {
      cleanupUploads(err, req, {}, resolve);
    });

    // The original error still reaches the error handler untouched.
    expect(forwarded).toBe(err);

    await new Promise((resolve) => setImmediate(resolve));
    expect(destroySpy.mock.calls.map((c) => c[0]).sort()).toEqual([
      "shitblej-products/upload-a",
      "shitblej-products/upload-b",
    ]);
  });

  it("handles a single-file upload (avatar)", async () => {
    const req = { file: { filename: "shitblej-products/avatar" } };

    await new Promise((resolve) => {
      cleanupUploads(new Error("nope"), req, {}, resolve);
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(destroySpy).toHaveBeenCalledWith(
      "shitblej-products/avatar",
      expect.objectContaining({ invalidate: true }),
    );
  });

  it("does nothing when the failed request had no uploads", async () => {
    const forwarded = await new Promise((resolve) => {
      cleanupUploads(new Error("nope"), {}, {}, resolve);
    });

    expect(forwarded).toBeInstanceOf(Error);
    expect(destroySpy).not.toHaveBeenCalled();
  });
});
