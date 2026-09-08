const { test, expect } = require("@playwright/test");
const { registerUser, createListing } = require("../helpers/api");

// The cheap, broad checks: that the app boots against a real API at all, that
// a guest can see listings, and that the routes which need an account say so
// instead of rendering a broken page.
//
// These would have caught the two whole-app failures this project has actually
// had: a blank page from a provider throwing during render, and a build with
// no VITE_API_URL issuing requests to relative paths.

test.describe("browsing as a guest", () => {
  test("the home page renders listings from the API", async ({ page, request }) => {
    const seller = await registerUser(request);
    const product = await createListing(request, seller.token, {
      name: `E2E Guest Visible ${Date.now()}`,
    });

    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    await expect(page.getByText(product.name).first()).toBeVisible();
    // A provider that throws leaves an empty <div id="root"> and no other
    // symptom, so assert the absence explicitly.
    expect(errors).toEqual([]);
  });

  test("a listing page is readable without an account", async ({ page, request }) => {
    const seller = await registerUser(request);
    const product = await createListing(request, seller.token);

    await page.goto(`/products/${product._id}`);

    await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
    await expect(page.getByRole("button", { name: "Make Offer", exact: true })).toBeVisible();
  });

  test("a protected route sends a guest to sign in rather than breaking", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unknown route renders the 404 page, not a blank one", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.locator("#root")).not.toBeEmpty();
  });
});

test.describe("signing in through the UI", () => {
  test("an existing account can log in and reach the inbox", async ({ page, request }) => {
    // The one place the login form itself is exercised. Everywhere else seeds
    // the session directly, so that a broken form fails here and only here.
    const user = await registerUser(request);

    // Start where a real user starts: at the page they wanted. ProtectedRoute
    // sends them to /login carrying that destination, and signing in has to
    // put them back - otherwise every interrupted session lands on the home
    // page and has to navigate again.
    await page.goto("/inbox");
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(user.email);
    // Anchored, for two reasons: the label reads "Password*" (the asterisk is
    // decorative and aria-hidden, but getByLabel matches label text rather
    // than the computed accessible name), and a bare "Password" also matches
    // the "Show password" toggle's aria-label.
    await page.getByLabel(/^Password/).fill(user.password);
    await page.getByRole("button", { name: /log in|sign in/i }).click();

    await expect(page).toHaveURL(/\/inbox/);
  });
});
