const API_ORIGIN = `http://127.0.0.1:${process.env.E2E_API_PORT || "4000"}`;
const API = `${API_ORIGIN}/api/v1`;

// Talking to the API directly, for setup only.
//
// The rule these tests follow: whatever is being TESTED goes through the
// browser; whatever is merely a precondition can go through the API. A test
// about accepting an offer should not spend thirty seconds re-signing-up a
// seller through the UI - and if it did, a broken signup form would fail every
// test in the file instead of the one that covers signup.

let counter = 0;
const unique = (prefix) => `${prefix}-${Date.now()}-${(counter += 1)}`;

// Generated, not a constant: a literal password in source is a secret-shaped
// string in a public repository even when it guards nothing. Satisfies the
// signup rule (at least one letter and one digit, six or more characters).
const generatePassword = () =>
  `e2e${require("crypto").randomBytes(9).toString("hex")}`;

/** Register a user and return { token, user, email, password }. */
async function registerUser(request, overrides = {}) {
  const email = overrides.email || `${unique("e2e")}@example.com`;
  const password = overrides.password || generatePassword();
  const name = overrides.name || `E2E ${unique("user")}`;

  const res = await request.post(`${API}/users/register`, {
    data: { name, email, password },
  });
  if (!res.ok()) {
    throw new Error(`registerUser failed (${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  return { token: body.token, user: body.data, email, password, name };
}

/** Create a listing with one image, as that user. Returns the product. */
async function createListing(request, token, overrides = {}) {
  const res = await request.post(`${API}/products`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      name: overrides.name || `E2E Listing ${unique("p")}`,
      price: String(overrides.price ?? 100),
      category: overrides.category || "electronics",
      condition: overrides.condition || "Used - Good",
      description: overrides.description || "Created by the e2e harness.",
      location: overrides.location || "Prishtina, Kosovo",
      images: {
        name: "listing.png",
        mimeType: "image/png",
        buffer: require("../fixtures/pixel").PNG,
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`createListing failed (${res.status()}): ${await res.text()}`);
  }
  return (await res.json()).data;
}

module.exports = { API, API_ORIGIN, registerUser, createListing, unique };
