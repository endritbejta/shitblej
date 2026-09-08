const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");
const { spawnSync } = require("child_process");

const { LocalUploadStorage } = require("../src/config/localUploadStorage");

// A multer file, as multer hands it to a storage engine.
const fakeFile = (contents, { mimetype = "image/png", originalname = "photo.png" } = {}) => ({
  stream: Readable.from([Buffer.from(contents)]),
  mimetype,
  originalname,
});

const handle = (storage, file) =>
  new Promise((resolve, reject) =>
    storage._handleFile({}, file, (err, info) => (err ? reject(err) : resolve(info)))
  );

const remove = (storage, file) =>
  new Promise((resolve, reject) =>
    storage._removeFile({}, file, (err) => (err ? reject(err) : resolve()))
  );

describe("LocalUploadStorage", () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "shitblej-uploads-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes the file and reports it under the same property names as the Cloudinary engine", async () => {
    const storage = new LocalUploadStorage({ directory: dir, publicPath: "/uploads" });

    const info = await handle(storage, fakeFile("pretend-png-bytes"));

    // These four names are the engine contract - product.images stores `path`,
    // cleanup works from `filename`. A driver that returned different keys
    // would break the app rather than the test.
    expect(info.path).toBe(`/uploads/${info.filename}`);
    expect(info.mimetype).toBe("image/png");
    expect(info.size).toBe(Buffer.byteLength("pretend-png-bytes"));

    expect(fs.readFileSync(path.join(dir, info.filename), "utf8")).toBe("pretend-png-bytes");
  });

  it("names the file itself instead of trusting the uploaded name", async () => {
    const storage = new LocalUploadStorage({ directory: dir });

    // The directory is served over HTTP, so a client-chosen name is a way to
    // decide what this server hosts and under what extension.
    const info = await handle(
      storage,
      fakeFile("x", { originalname: "../../evil.html", mimetype: "image/png" })
    );

    expect(info.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(info.filename).not.toContain("evil");
    expect(fs.readdirSync(dir)).toEqual([info.filename]);
  });

  it("takes the extension from the mimetype, not the filename", async () => {
    const storage = new LocalUploadStorage({ directory: dir });

    const info = await handle(
      storage,
      fakeFile("x", { originalname: "photo.jpg.svg", mimetype: "image/jpeg" })
    );

    expect(info.filename.endsWith(".jpg")).toBe(true);
  });

  it("refuses a type outside the image allowlist and writes nothing", async () => {
    const storage = new LocalUploadStorage({ directory: dir });

    await expect(
      handle(storage, fakeFile("<script>", { mimetype: "text/html" }))
    ).rejects.toThrow(/Unsupported image type: text\/html/);

    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("leaves no partial file behind when the upload stream fails mid-write", async () => {
    const storage = new LocalUploadStorage({ directory: dir });

    const stream = new Readable({
      read() {
        this.push(Buffer.from("first-chunk"));
        this.destroy(new Error("connection reset"));
      },
    });

    await expect(
      handle(storage, { stream, mimetype: "image/png", originalname: "a.png" })
    ).rejects.toThrow("connection reset");

    // A bare .pipe() would leave the truncated file and a leaked descriptor.
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("removes a file on _removeFile, and treats already-gone as done", async () => {
    const storage = new LocalUploadStorage({ directory: dir });
    const info = await handle(storage, fakeFile("bytes"));

    await remove(storage, info);
    expect(fs.readdirSync(dir)).toEqual([]);

    // multer can call this for a file another failure already cleaned up.
    await expect(remove(storage, info)).resolves.toBeUndefined();
  });

  it("creates its directory rather than requiring one to exist", () => {
    const nested = path.join(dir, "a", "b", "c");
    new LocalUploadStorage({ directory: nested });
    expect(fs.existsSync(nested)).toBe(true);
  });
});

// The config module calls process.exit(1) on invalid env, which is the point -
// so these run it in a child process and assert on the exit code and message.
// Requiring it in-process would end the test run.
const bootConfig = (env) =>
  spawnSync(process.execPath, ["-e", "require('./src/config')"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      MONGO_URI: "mongodb://127.0.0.1:27017/x",
      JWT_SECRET: "s",
      CLIENT_URL: "http://localhost:5173",
      ...env,
    },
  });

describe("UPLOAD_DRIVER configuration", () => {
  it("boots without Cloudinary credentials when the driver is local", () => {
    // The reason this driver exists: a fresh clone has no Cloudinary account,
    // and previously could not list a product at all.
    const { status, stderr } = bootConfig({ UPLOAD_DRIVER: "local" });
    expect(stderr).toBe("");
    expect(status).toBe(0);
  });

  it("still demands Cloudinary credentials when that is the driver", () => {
    const { status, stderr } = bootConfig({ UPLOAD_DRIVER: "cloudinary" });
    expect(status).toBe(1);
    expect(stderr).toContain("CLOUDINARY_CLOUD_NAME is required when UPLOAD_DRIVER=cloudinary");
    expect(stderr).toContain("CLOUDINARY_API_KEY is required");
    expect(stderr).toContain("CLOUDINARY_API_SECRET is required");
  });

  it("defaults to cloudinary, so an unset driver cannot silently store locally", () => {
    const { status, stderr } = bootConfig({});
    expect(status).toBe(1);
    expect(stderr).toContain("UPLOAD_DRIVER=cloudinary");
  });

  it("refuses to start with the local driver in production", () => {
    // Local disk on a container platform is ephemeral and per instance:
    // images would vanish on the next deploy and 404 on every other instance.
    const { status, stderr } = bootConfig({
      UPLOAD_DRIVER: "local",
      NODE_ENV: "production",
    });
    expect(status).toBe(1);
    expect(stderr).toContain("UPLOAD_DRIVER=local is not usable in production");
  });

  it("rejects a driver name it does not implement", () => {
    const { status, stderr } = bootConfig({ UPLOAD_DRIVER: "s3" });
    expect(status).toBe(1);
    expect(stderr).toContain("UPLOAD_DRIVER");
  });
});
