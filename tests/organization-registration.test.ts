import test from "node:test";
import assert from "node:assert/strict";
import { organizationRegistrationInput, possibleOrganization } from "../src/lib/organizations/registration.ts";

test("organization registration accepts free email domains without granting access", () => {
  const input = organizationRegistrationInput({ organizationName: "Fundacja Dobro", organizationEmail: "kontakt@gmail.com", applicantName: "Jan Kowalski", email: "jan@gmail.com", password: "bezpieczne-haslo-12" });
  assert.ok(input);
  assert.equal(input.organizationEmail, "kontakt@gmail.com");
  assert.equal(input.applicantEmail, "jan@gmail.com");
});

test("organization registration keeps applicant email separate from job title", () => {
  const input = organizationRegistrationInput({
    organizationName: "Fundacja Dobro",
    organizationEmail: "kontakt@mapadobra.local",
    applicantName: "Jan Kowalski",
    email: "admin@mapadobra.local",
    jobTitle: "Koordynator",
    password: "bezpieczne-haslo-12",
  });
  assert.ok(input);
  assert.equal(input.applicantEmail, "admin@mapadobra.local");
  assert.equal(input.applicantPosition, "Koordynator");
  assert.equal("role" in input, false);
});

test("organization registration accepts an empty optional job title", () => {
  const input = organizationRegistrationInput({ organizationName: "Fundacja Dobro", organizationEmail: "kontakt@gmail.com", applicantName: "Jan Kowalski", email: "jan@gmail.com", jobTitle: "   ", password: "bezpieczne-haslo-12" });
  assert.ok(input);
  assert.equal(input.applicantPosition, null);
});

test("organization registration rejects short credentials", () => {
  assert.equal(organizationRegistrationInput({ organizationName: "A", organizationEmail: "bad", applicantName: "A", applicantEmail: "bad", password: "short" }), null);
});

test("organization registration exposes possible matches without merging", () => {
  const match = possibleOrganization("Caritas Archidiecezji Łódzkiej", [{ id: "1", name: "Caritas Archidiecezji Lodzkiej" }, { id: "2", name: "Inna organizacja" }]);
  assert.equal(match?.id, "1");
});
