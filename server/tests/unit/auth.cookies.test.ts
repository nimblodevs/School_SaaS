import assert from "node:assert/strict";
import { test } from "vitest";
import {
  ACCESS_TOKEN_COOKIE,
  readCookieValue,
  REFRESH_TOKEN_COOKIE,
} from "../../src/modules/auth/auth.cookies.ts";

test("auth cookies are read by name from a cookie header", () => {
  const header = `${ACCESS_TOKEN_COOKIE}=access-value; ${REFRESH_TOKEN_COOKIE}=refresh-value`;

  assert.equal(readCookieValue(header, ACCESS_TOKEN_COOKIE), "access-value");
  assert.equal(readCookieValue(header, REFRESH_TOKEN_COOKIE), "refresh-value");
});

test("duplicate cookie names are rejected as ambiguous", () => {
  const header = `${ACCESS_TOKEN_COOKIE}=first; ${ACCESS_TOKEN_COOKIE}=second`;

  assert.equal(readCookieValue(header, ACCESS_TOKEN_COOKIE), undefined);
});
