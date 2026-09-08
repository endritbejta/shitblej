
// Put a signed-in session in place before the app boots.
//
// The token and the cached profile live in localStorage under "token" and
// "user" (see src/lib/authToken.js), and AuthContext hydrates from them on
// first render so the app can paint signed-in chrome without waiting on a
// round trip. Writing them with addInitScript means they are there before any
// application code runs - setting them after navigation would race the
// hydration and sometimes render the signed-out header.
//
// Deliberately not "log in through the UI every time": that is covered by its
// own test, once. Repeating it as setup would make a broken login form look
// like a broken checkout.
async function signIn(page, { token, user }) {
  await page.addInitScript(
    ([t, u]) => {
      window.localStorage.setItem("token", t);
      window.localStorage.setItem("user", JSON.stringify(u));
    },
    [token, user]
  );
}

module.exports = { signIn };
