const { Readable } = require("stream");
const { Writable } = require("stream");
const { CloudinaryStorage } = require("../src/config/cloudinaryStorage");

// A stand-in for cloudinary.uploader that captures what it was asked to do.
// `upload_stream` returns a writable the engine pipes into, then calls back -
// the same shape as the real SDK.
const fakeCloudinary = ({ result, error } = {}) => {
  const calls = { uploads: [], destroys: [] };
  return {
    calls,
    uploader: {
      upload_stream: (params, cb) => {
        calls.uploads.push(params);
        const chunks = [];
        const sink = new Writable({
          write(chunk, _enc, next) {
            chunks.push(chunk);
            next();
          },
        });
        sink.on("finish", () => {
          calls.received = Buffer.concat(chunks).toString();
          if (error) return cb(error);
          cb(null, result);
        });
        return sink;
      },
      destroy: (publicId, options) => {
        calls.destroys.push({ publicId, options });
        return Promise.resolve({ result: "ok" });
      },
    },
  };
};

const fileFrom = (text, mimetype = "image/jpeg") => ({
  mimetype,
  stream: Readable.from([Buffer.from(text)]),
});

const handle = (storage, file) =>
  new Promise((resolve, reject) => {
    storage._handleFile({}, file, (err, info) => (err ? reject(err) : resolve(info)));
  });

describe("CloudinaryStorage", () => {
  it("requires an SDK instance rather than reaching for a module", () => {
    // Requiring ./cloudinary back would be circular: that module requires this
    // one while its own exports are unassigned, so the import would resolve to
    // undefined and the first upload would throw at runtime.
    expect(() => new CloudinaryStorage({})).toThrow(/requires a cloudinary instance/i);
  });

  it("streams the file through and reports the URL and public id", async () => {
    const cloudinary = fakeCloudinary({
      result: {
        secure_url: "https://res.cloudinary.com/demo/image/upload/v1/shitblej-products/a.jpg",
        public_id: "shitblej-products/a",
        bytes: 2048,
      },
    });
    const storage = new CloudinaryStorage({ cloudinary, params: { folder: "shitblej-products" } });

    const info = await handle(storage, fileFrom("image-bytes"));

    // These property names are a contract, not incidental: the controller
    // stores `path` on the product and asset cleanup deletes by `filename`.
    expect(info.path).toContain("res.cloudinary.com");
    expect(info.filename).toBe("shitblej-products/a");
    expect(info.size).toBe(2048);
    expect(info.mimetype).toBe("image/jpeg");
    expect(cloudinary.calls.received).toBe("image-bytes");
  });

  it("passes the configured params straight to the upload", async () => {
    const params = {
      folder: "shitblej-products",
      allowed_formats: ["jpg", "png"],
      transformation: [{ width: 1200, crop: "limit" }],
    };
    const cloudinary = fakeCloudinary({ result: { secure_url: "u", public_id: "p" } });

    await handle(new CloudinaryStorage({ cloudinary, params }), fileFrom("x"));

    // allowed_formats is the server-side format guard; losing it in the
    // rewrite would silently accept anything.
    expect(cloudinary.calls.uploads[0]).toEqual(params);
  });

  it("surfaces an upload failure instead of hanging the request", async () => {
    const cloudinary = fakeCloudinary({ error: new Error("cloudinary rejected it") });
    const storage = new CloudinaryStorage({ cloudinary, params: {} });

    await expect(handle(storage, fileFrom("x"))).rejects.toThrow(/cloudinary rejected it/);
  });

  it("treats a missing result as an error rather than storing undefined", async () => {
    const cloudinary = fakeCloudinary({ result: undefined });
    const storage = new CloudinaryStorage({ cloudinary, params: {} });

    // Without this the product would be saved with `images: [undefined]`.
    await expect(handle(storage, fileFrom("x"))).rejects.toThrow(/no result/i);
  });

  it("reports a read error on the incoming file", async () => {
    const cloudinary = fakeCloudinary({ result: { secure_url: "u", public_id: "p" } });
    const storage = new CloudinaryStorage({ cloudinary, params: {} });

    const file = { mimetype: "image/jpeg", stream: new Readable({ read() {} }) };
    const pending = handle(storage, file);
    file.stream.emit("error", new Error("connection reset mid-upload"));

    await expect(pending).rejects.toThrow(/connection reset/);
  });

  it("undoes an upload when multer rolls the request back", async () => {
    const cloudinary = fakeCloudinary();
    const storage = new CloudinaryStorage({ cloudinary, params: {} });

    await new Promise((resolve, reject) =>
      storage._removeFile({}, { filename: "shitblej-products/a" }, (err) =>
        err ? reject(err) : resolve()
      )
    );

    expect(cloudinary.calls.destroys).toEqual([
      { publicId: "shitblej-products/a", options: { invalidate: true } },
    ]);
  });

  it("has nothing to undo when the upload never produced a public id", async () => {
    const cloudinary = fakeCloudinary();
    const storage = new CloudinaryStorage({ cloudinary, params: {} });

    await new Promise((resolve, reject) =>
      storage._removeFile({}, {}, (err) => (err ? reject(err) : resolve()))
    );

    expect(cloudinary.calls.destroys).toHaveLength(0);
  });
});
