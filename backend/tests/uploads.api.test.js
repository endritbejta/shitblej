const fs = require("fs");

const request = require("supertest");

const { server: app } = require("./helpers/api");
const db = require("./helpers/db");
const { createUser } = require("./helpers/factories");
const { eventually } = require("./helpers/eventually");
const config = require("../src/config");

// The upload path, through a real request.
//
// Everything up to now created products by inserting them with a fake image
// URL, so multer, the storage engine and the orphan-release middleware had
// never run together against the API. These are the first tests that post an
// actual image.

// Smallest valid PNG: 1x1, transparent.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

const uploadDir = config.uploads.directory;
const filesInStore = () => (fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : []);

const listing = {
  name: "Upload Path Bike",
  price: "120",
  category: "sport",
  condition: "Used - Good",
  description: "Posted through the real multipart route.",
};

const postListing = (token, fields = listing) => {
  const req = request(app).post("/api/v1/products").set("Authorization", `Bearer ${token}`);
  Object.entries(fields).forEach(([key, value]) => req.field(key, value));
  return req;
};

describe("product image upload", () => {
  let before;

  beforeAll(() => db.connect());
  afterEach(() => db.clear());
  beforeEach(() => {
    before = filesInStore();
  });

  it("uses the local driver in tests, so no test can reach Cloudinary", () => {
    // If this ever flips, the suite starts making paid third-party calls.
    expect(config.uploads.driver).toBe("local");
  });

  it("stores a posted image and serves it back at the URL on the product", async () => {
    const { token } = await createUser();

    const res = await postListing(token).attach("images", PNG, "bike.png");

    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(1);

    const url = res.body.data.images[0];
    // Absolute, not root-relative: the frontend is served from a different
    // origin than the API, so "/uploads/x.png" would resolve against the
    // static host and 404. This is what the e2e run caught.
    expect(url).toMatch(
      new RegExp(`^${config.uploads.publicBaseUrl}/uploads/[0-9a-f-]{36}\\.png$`)
    );

    // The URL the product stores has to actually resolve - that is the whole
    // contract between the storage engine and the frontend's <img src>.
    const served = await request(app).get(new URL(url).pathname);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toMatch(/image\/png/);
    expect(Buffer.compare(served.body, PNG)).toBe(0);
  });

  it("accepts up to five images and keeps their order", async () => {
    const { token } = await createUser();

    let req = postListing(token);
    for (let i = 0; i < 5; i += 1) req = req.attach("images", PNG, `img-${i}.png`);
    const res = await req;

    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(5);
    expect(new Set(res.body.data.images).size).toBe(5);
  });

  it("rejects a sixth image rather than silently dropping it", async () => {
    const { token } = await createUser();

    let req = postListing(token);
    for (let i = 0; i < 6; i += 1) req = req.attach("images", PNG, `img-${i}.png`);
    const res = await req;

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("releases the uploaded images when the payload is rejected", async () => {
    const { token } = await createUser();

    // Uploads run before validation on multipart routes - the text fields only
    // exist on req.body once multer has parsed the form - so a rejected
    // listing has already written its images. Without cleanupUploads they stay
    // forever with nothing referencing them.
    const res = await postListing(token, { name: "Missing everything else" }).attach(
      "images",
      PNG,
      "orphan.png"
    );

    expect(res.status).toBe(400);

    // Cleanup is fire-and-forget so the client is not made to wait on it, and
    // the unlink resolves off the threadpool - poll rather than assuming one
    // event-loop turn is enough.
    await eventually(() => filesInStore().length === before.length, {
      label: "orphaned upload released",
    });
  });

  it("refuses an unauthenticated upload before writing anything", async () => {
    const res = await request(app)
      .post("/api/v1/products")
      .field("name", "Anonymous")
      .attach("images", PNG, "nope.png");

    expect(res.status).toBe(401);
    expect(filesInStore()).toEqual(before);
  });

  it("does not serve a path outside the upload directory", async () => {
    // express.static resolves the path itself; this asserts it, because the
    // directory is now reachable over HTTP.
    const res = await request(app).get("/uploads/../package.json");
    expect(res.status).not.toBe(200);
  });

  it("404s an upload URL that does not exist instead of falling through", async () => {
    const res = await request(app).get("/uploads/00000000-0000-4000-8000-000000000000.png");
    expect(res.status).toBe(404);
  });

  it("relaxes Cross-Origin-Resource-Policy for uploads, but only for uploads", async () => {
    const { token } = await createUser();
    const res = await postListing(token).attach("images", PNG, "corp.png");
    const url = new URL(res.body.data.images[0]).pathname;

    const served = await request(app).get(url);
    // Without this the browser refuses to render the image even though the
    // response is a clean 200: helmet's default is same-origin, and the
    // frontend is served from a different origin than the API. Invisible to a
    // request-level test until asserted, which is why the end-to-end run
    // found it first.
    expect(served.headers["cross-origin-resource-policy"]).toBe("cross-origin");

    // ...and the rest of the API keeps the strict default.
    const api = await request(app).get("/api/v1/products");
    expect(api.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  afterAll(async () => {
    await db.disconnect();
    // Leave the store as it was found.
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });
});
