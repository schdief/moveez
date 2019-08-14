//TODO: add to avoid flaky test
//reset database
/* before(function () {
  cy.log("reset db")
  clear all data before starting tests
  cy.request('PUT', 'https://api.mlab.com/api/1/databases/title_uat/collections/titles?apiKey=' + Cypress.env('API_KEY'), {})
  cy.request({
    method: 'PUT',
    url: 'https://api.mlab.com/api/1/databases/title_uat/collections/titles?apiKey=' + Cypress.env('API_KEY'),
    body: {},
    headers: {
        'content-type': 'application/json'
    }
  })
}) */

describe("The Title Page", function() {
  beforeEach(() => {
    Cypress.Cookies.preserveOnce("connect.sid");
  });
  it("can login", function() {
    cy.visit("/login", {
      method: "POST",
      auth: { username: "cypress", password: "cypress" }
    });
  });
  it("successfully loads", function() {
    cy.visit("/title"); // change URL to match your dev URL
  });
  //TODO: check version

  describe("Adding a Title", function() {
    it("is aided by a suggestion from iMDB when typing", function() {
      //TODO: remove delay, not needed anymore
      cy.get("#searchNewTitle")
        .type("Inception", { delay: 100 })
        .wait(1000);
    });
    it("can be done by clicking +", function() {
      cy.get(".addSuggestionButton")
        .first()
        .click();
    });
    it("shows a success flash message", function() {
      cy.get("#successAlert").should("be.visible");
      cy.get("#successAlert").should("contain", "You've added");
    });
    it("results in a new entry in the list", function() {
      cy.get("#watchList").contains("Inception");
    });
    it("fetches the user rating of Rottentomato via ketchup", function() {
      cy.get("#tomatoUserRating").should("not.contain", "-");
    });
  });

  //TODO: currently the suggestion call to omdb might fail, resulting in an exception which isn't caught
  Cypress.on("uncaught:exception", (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    return false;
  });

  describe("Marking a Title as seen", function() {
    it("can be done by clicking the checkmark symbol", function() {
      cy.get("#toggleSeenStatusButton").click();
    });
    it("shows the title in the binge history", function() {
      cy.get("#bingeHistory").should("contain", "Inception");
    });
    it("can be put back to the list by clicking the reload symbol", function() {
      cy.get("#toggleSeenStatusButton").click();
      cy.get("#watchList").contains("Inception");
    });
  });

  describe("Deleting a Title", function() {
    it("can be triggered by clicking the trash symbol", function() {
      cy.wait(1000);
      cy.get("#deleteButton").click();
      cy.wait(1000);
      cy.get("#deleteModal").should("be.visible");
    });
    it("can be aborted by saying nope", function() {
      cy.get("#abortDeleteButton").click();
      cy.wait(1000);
      cy.get("#deleteModal").should("not.be.visible");
      cy.get("#watchList").should("contain", "Inception");
    });
    it("can be performed by saying delete", function() {
      cy.wait(1000);
      cy.get("#deleteButton").click();
      cy.get("#deleteModalButton").click();
    });
    it("shows a success flash message", function() {
      cy.get("#successAlert").should("be.visible");
      cy.get("#successAlert").should("contain", "You've deleted");
    });
    it("results in a deleted entry", function() {
      cy.get("#watchList").should("not.contain", "Inception");
    });
  });

  describe("logout button", () => {
    it("shows username", () => {
      cy.get("#logout").should("contain", "cypress");
    });
    it("can logout", () => {
      cy.get("#logout").click();
      cy.url().should("eq", Cypress.config().baseUrl + "/"); // leads to home page
      cy.visit("/title"); // can't reenter without login...
      cy.url().should("eq", Cypress.config().baseUrl + "/"); // and leads to home page again
    });
  });
});
