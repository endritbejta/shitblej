const { test, expect } = require("@playwright/test");
const { registerUser } = require("../helpers/api");
const { signIn } = require("../helpers/session");
const { PNG } = require("../fixtures/pixel");

// The money path: list -> offer -> accept -> checkout -> chat.
//
// Every other test in this repository sits on one side of the wire. The
// backend suite drives Express with supertest and never renders anything; the
// web suite renders components against a mocked API client. Both can be green
// while the two halves disagree - a renamed field, a changed envelope, a CORS
// origin, an offer state the UI does not know how to display.
//
// This is one long test on purpose. It is a journey, not a unit: the buyer
// cannot check out without an accepted offer, and there is no accepted offer
// without a seller who listed something. Splitting it would mean rebuilding
// the same state three times, and the interesting failures live in the
// handoffs between the steps.
//
// Two browser contexts, because two people are involved and the handoff
// between them is the part most likely to break. One context with a swapped
// token would not catch a seller seeing a buyer's controls.

test.describe("the money path", () => {
  test("a buyer negotiates, checks out, and can then message the seller", async ({
    browser,
    request,
  }) => {
    // Accounts are set up through the API. Signup has its own test; repeating
    // it here would mean a broken signup form failed every test in the file.
    const seller = await registerUser(request, { name: "E2E Seller" });
    const buyer = await registerUser(request, { name: "E2E Buyer" });

    const sellerContext = await browser.newContext();
    const buyerContext = await browser.newContext();
    const sellerPage = await sellerContext.newPage();
    const buyerPage = await buyerContext.newPage();
    await signIn(sellerPage, seller);
    await signIn(buyerPage, buyer);

    const title = `E2E Vintage Camera ${Date.now()}`;
    let productUrl;
    let agreedPrice;

    await test.step("the seller lists an item, with a photo", async () => {
      await sellerPage.goto("/sell");

      // The file input is visually hidden behind a styled dropzone;
      // setInputFiles drives the input itself, which is what a real pick does.
      await sellerPage
        .locator('input[type="file"]')
        .setInputFiles({ name: "camera.png", mimeType: "image/png", buffer: PNG });

      await sellerPage.getByLabel("Title").fill(title);
      await sellerPage.getByLabel("Category").selectOption("electronics");
      await sellerPage.getByLabel("Condition").selectOption("Used - Good");
      await sellerPage
        .getByLabel("Description")
        .fill("Works perfectly. Listed by the end-to-end harness.");
      await sellerPage.getByLabel("Price").fill("100");
      await sellerPage.getByLabel("Location").fill("Prishtina, Kosovo");

      await sellerPage.getByRole("button", { name: "Publish listing" }).click();

      // This is the upload path end to end: multipart out of the browser,
      // through multer and the storage engine, back as a URL on the product.
      await expect(sellerPage.getByText("Your listing is live")).toBeVisible();

      await sellerPage.getByRole("link", { name: "View listing" }).click();
      await expect(sellerPage).toHaveURL(/\/products\/[a-f0-9]{24}$/);
      productUrl = new URL(sellerPage.url()).pathname;

      // The stored image URL has to actually resolve, or every listing shows a
      // broken thumbnail. naturalWidth rather than toBeVisible: the page
      // renders a mobile and a desktop gallery and hides one by viewport, so
      // visibility says nothing about whether the bytes arrived - and it is
      // the bytes that matter. This is what caught the driver returning
      // root-relative URLs, which resolved against the static host.
      const image = sellerPage.locator('img[src*="/uploads/"]').first();
      await expect
        .poll(async () => image.evaluate((el) => el.complete && el.naturalWidth > 0), {
          timeout: 15_000,
        })
        .toBe(true);
    });

    await test.step("chat is locked before any agreement exists", async () => {
      // The actual gate, and the reason it exists: a buyer must not be able to
      // open a chat and take the transaction off the platform. Nothing has
      // been agreed yet, so there is no composer at all.
      await buyerPage.goto(`/inbox?userId=${seller.user._id}`);

      await expect(buyerPage.getByText(/Messaging unlocks/)).toBeVisible();
      await expect(buyerPage.getByPlaceholder("Write a message…")).toHaveCount(0);
    });

    await test.step("the buyer makes an offer below asking", async () => {
      await buyerPage.goto(productUrl);
      await expect(buyerPage.getByRole("heading", { name: title })).toBeVisible();

      await buyerPage.getByRole("button", { name: "Make Offer", exact: true }).click();

      const dialog = buyerPage.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Make an offer" })).toBeVisible();

      // Pick one of the amounts the backend suggested rather than inventing a
      // number: the bounds come from /offers/options, so a hardcoded value
      // would start failing the day the pricing rules change.
      const suggestion = dialog
        .getByRole("group", { name: "Suggested offers" })
        .getByRole("button")
        .first();
      agreedPrice = (await suggestion.innerText()).trim();
      await suggestion.click();

      await dialog.getByRole("button", { name: "Send offer" }).click();

      // A sent offer drops the buyer into the negotiation with the seller.
      await expect(buyerPage).toHaveURL(new RegExp(`/inbox\\?userId=${seller.user._id}`));
      await expect(buyerPage.getByText(agreedPrice).first()).toBeVisible();

      // Still locked. A *pending* offer is not an agreement - only an accepted
      // one is - so sending an offer must not be a way around the gate.
      await expect(buyerPage.getByPlaceholder("Write a message…")).toHaveCount(0);
    });

    await test.step("the seller sees the negotiation and accepts", async () => {
      await sellerPage.goto("/inbox");

      // Not a deep link: the offer must have created a real conversation, or
      // the seller never learns anyone is interested.
      await sellerPage.getByRole("button", { name: /E2E Buyer/ }).first().click();

      await expect(sellerPage.getByText(agreedPrice).first()).toBeVisible();
      await sellerPage.getByRole("button", { name: "Accept", exact: true }).click();

      // Accepting is what unlocks checkout for the buyer; until then the
      // reservation does not exist.
      await expect(
        sellerPage.getByRole("button", { name: "Accept", exact: true })
      ).toHaveCount(0);
    });

    await test.step("acceptance unlocks chat, before any checkout", async () => {
      await buyerPage.reload();
      await buyerPage.getByRole("button", { name: /E2E Seller/ }).first().click();

      // This is the documented policy (see message.policy.js): text is allowed
      // once there is an accepted offer inside its checkout window, precisely
      // so the pair can coordinate the handover before an order exists. The
      // gate is on *agreement*, not on payment.
      await expect(buyerPage.getByPlaceholder("Write a message…")).toBeVisible();
    });

    await test.step("the buyer completes checkout", async () => {
      await buyerPage.getByRole("button", { name: "Complete checkout" }).click();

      const dialog = buyerPage.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Complete checkout" })).toBeVisible();

      // The price agreed in the negotiation is the price being charged. A
      // mismatch here would be the most expensive bug in the app.
      await expect(dialog.getByText(agreedPrice)).toBeVisible();

      await dialog.getByLabel("Full name").fill("E2E Buyer");
      await dialog.getByLabel("Phone for delivery").fill("+38344123456");
      await dialog.getByLabel("Street address").fill("Rr. Nena Tereze 1");
      await dialog.getByLabel("City").fill("Prishtina");
      await dialog.getByLabel("Postal code").fill("10000");
      await dialog.getByLabel("Country").fill("Kosovo");

      await dialog.getByRole("button", { name: "Complete checkout" }).click();
      await expect(buyerPage.getByRole("dialog")).toHaveCount(0);
    });

    await test.step("chat stays open after checkout, and the seller receives the message", async () => {
      // The order now carries the conversation, so the unlock no longer
      // depends on the accepted offer's checkout window still being live.
      const composer = buyerPage.getByPlaceholder("Write a message…");
      await expect(composer).toBeVisible();

      // Letters only. A timestamp here is nine-plus consecutive digits, which
      // the contact-details filter correctly reads as a phone number and
      // rejects - the platform does not let people swap numbers in chat.
      const nonce = Array.from({ length: 6 }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26))
      ).join("");
      const text = `Paid - when can you ship? ref ${nonce}`;
      await composer.fill(text);

      // Wait for the write, not just for the text to appear. The composer
      // renders optimistically and reverts on failure, so asserting on the
      // rendered bubble alone would pass for a message the server refused -
      // which is exactly what happened while this test was being written.
      const [response] = await Promise.all([
        buyerPage.waitForResponse(
          (r) => r.url().includes("/api/v1/messages") && r.request().method() === "POST"
        ),
        buyerPage.getByRole("button", { name: "Send message" }).click(),
      ]);
      expect(response.status()).toBe(201);

      // .first(): the text lands in the thread AND in the sidebar's
      // last-message preview, which is correct behaviour, not a duplicate.
      await expect(buyerPage.getByText(text).first()).toBeVisible();

      // Arrives on the seller's already-open page, which means the Socket.IO
      // connection survived the cross-origin build - the thing the dev
      // server's proxy would have hidden.
      await expect(sellerPage.getByText(text).first()).toBeVisible({ timeout: 15_000 });
    });

    await sellerContext.close();
    await buyerContext.close();
  });
});
