describe('The Home Page', function() {
  it('successfully loads', function() {
    cy.visit('/')
  })
})

describe('The Enter Button', function() {
  it('can be clicked', function() {
    cy.get('#enter').click()
  })
  it('leads to the title-page', function() {
    cy.url().should('include', '/title')
  })
})