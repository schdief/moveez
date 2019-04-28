describe('The Home Page', function() {
  it('successfully loads', function() {
    cy.visit('/')
  })
  
  it('can login', function() {
    cy.visit("/login", {method:"POST", auth: {username:"cypress", password:"cypress"}});
  })

  describe('The Enter Button', function() {

    it('can be clicked', function() {
      cy.visit('/')
      cy.get('#enter').click()
    })

    it('leads to the title-page', function() {
      cy.url().should('include', '/title')
    })
  })

  describe('The Impressum Button', function() {

    it('can be clicked', function() {
      cy.visit('/')
      cy.get('#gdpr').click()
    })

    it('leads to the impressum-page', function() {
      cy.url().should('include', '/impressum')
    })
  })
});