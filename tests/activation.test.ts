import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashSetupCode, setupCodesMatch, signInErrorMessage, validateAccountForm } from "../src/lib/activation";

const valid = {
  name: "Pranav Auti",
  email: "pranavauti2003@gmail.com",
  password: "a-real-password",
  confirm: "a-real-password",
  code: "ABCD-EFGH-IJKL-MNOP",
};

describe("account form", () => {
  it("accepts a complete owner form", () => {
    assert.equal(validateAccountForm(valid), null);
  });

  it("rejects a short or mismatched password", () => {
    assert.match(validateAccountForm({ ...valid, password: "short", confirm: "short" }) ?? "", /8 characters/);
    assert.match(validateAccountForm({ ...valid, confirm: "different-password" }) ?? "", /do not match/);
  });

  it("rejects another email shape and a missing code", () => {
    assert.match(validateAccountForm({ ...valid, email: "not-an-email" }) ?? "", /valid email/);
    assert.match(validateAccountForm({ ...valid, code: "no" }) ?? "", /setup code/);
  });
});

describe("setup code", () => {
  it("matches the code without storing it", () => {
    const hash = hashSetupCode("abcd-efgh-ijkl-mnop");
    assert.equal(setupCodesMatch("ABCD EFGH IJKL MNOP", hash), true);
    assert.equal(setupCodesMatch("ABCD-EFGH-IJKL-MNOQ", hash), false);
    assert.equal(hash.length, 64);
    assert.equal(hash === "ABCD-EFGH-IJKL-MNOP", false);
  });
});

describe("sign-in errors", () => {
  it("names a credential rejection", () => {
    assert.match(signInErrorMessage("invalid_credentials"), /don't match/);
    assert.match(signInErrorMessage("over_request_rate_limit"), /Too many/);
    assert.match(signInErrorMessage(undefined), /could not be completed/);
  });
});
