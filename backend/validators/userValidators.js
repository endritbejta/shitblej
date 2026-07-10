const { z } = require("zod");
const { objectId } = require("./common");

// Mirrors the User model constraints so bad input fails fast at the edge with
// a clear message instead of surfacing as a Mongoose ValidationError.
const email = z
  .string()
  .email("Please add a valid email")
  .toLowerCase()
  .trim();

const password = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/,
    "Password must contain at least one letter and one number"
  );

const phone = z
  .string()
  .regex(/^\+383\d{8,9}$/, "Please enter a valid Kosovo phone number");

exports.registerSchema = {
  body: z
    .object({
      name: z.string().trim().min(1, "name cannot be empty").optional(),
      email,
      phone: phone.optional(),
      password,
    })
    // Only these fields may reach User.create — blocks role/isVerified
    // injection through the register payload.
    .strip(),
};

exports.loginSchema = {
  body: z.object({
    email,
    password: z.string().min(1, "Please provide a password"),
  }),
};

exports.updateUserSchema = {
  params: z.object({ id: objectId("user id") }),
  body: z
    .object({
      name: z.string().trim().min(1).optional(),
      email: email.optional(),
      phone: phone.optional(),
      image: z.string().url().optional(),
      // password intentionally excluded — the service rejects it with a 400
      // pointing to a dedicated password route.
      password: z.string().optional(),
    })
    .strip(),
};

exports.userIdParamSchema = {
  params: z.object({ id: objectId("user id") }),
};
