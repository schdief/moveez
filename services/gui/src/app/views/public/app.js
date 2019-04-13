//dialogue to delete a title
function prepareDeleteModal(name, id) {
	//set name of modal
	$('#deleteModalName').text(name)
	//set button text for delete
	$('#deleteModalButton').attr('value', "Yes, delete '" + name + "'!")
	//set action to id of title
	$('#deleteModalForm').attr('action', '/title/' + id + '/?_method=DELETE')
	//show delete modal
	$('#deleteModal').modal('show')
}

//trigger fadeout of flash messages
window.onload = function() {
    $('.success.message').fadeOut(2500)
    $('.error.message').fadeOut(2500)
}

//update a title as seen or unseen
function toggleSeenStatus(id, name, seen) {
    let form = document.createElement('form')
    form.action = '/title/' + id + '/?_method=PUT'
    form.method = 'POST'
    if(seen) {
        form.innerHTML = '<input name="title[seen]" value="true"> <input name="title[seenOn]" value="' + Date.now() + '">'
    } else {
        form.innerHTML = '<input name="title[seen]" value="false">'
    }

    //the form must be in the document to submit it, but should be invisible
    form.hidden = true
    document.body.append(form)

    form.submit()
}

//suggestions from IMDB for adding a new title
//Define API endpoints once globally
$.fn.api.settings.api = {
    'search' : 'https://www.omdbapi.com/?s={value}&apikey=b50af808'
};
$('.search input')
  .api({
    debug: true,
    action: 'search',
    searchFullText: false,
    stateContext: '.ui.input',
    onSuccess: function(response) {
         if(response.Response === "True") {
             $('.results').html("")
             for (let suggestion of response.Search) {
                $('.results').append("<div class=\"suggestion item\" onclick=\"addTitle('" + suggestion.Title + "', '" + suggestion.imdbID + "', '" + suggestion.Year + "', '" + suggestion.Poster + "')\"><button class=\"ui icon teal button\" id=\"add\"><i class=\"add circle icon\"></i></button><img class=\"suggestionPoster\" src=\"" + suggestion.Poster + "\" width=\"30px\" height=\"44px\"><div class=\"suggestionContent\"><h4>" + suggestion.Title + "</h4>(" + suggestion.Year +  ")</div></div>")
             }
             $('.results').show()
         }
    },
  })
;

//add a new title
function addTitle(name, imdbID, year, poster) {

    let form = document.createElement('form')
    form.action = '/title'
    form.method = 'POST'

    var ratingRequest = new XMLHttpRequest();
    ratingRequest.onreadystatechange = function() {
        if (ratingRequest.readyState == 4 && ratingRequest.status == 200) {
            form.innerHTML = '<input name="title[name]" value="' + name + '"><input name="title[tomatoURL]" value="' + JSON.parse(ratingRequest.responseText).tomatoURL + '"><input name="title[imdbRating]" value="' + JSON.parse(ratingRequest.responseText).imdbRating + '"><input name="title[imdbID]" value="' + imdbID + '"><input name="title[year]" value="' + year + '"><input name="title[poster]" value="' + poster + '">'
            //the form must be in the document to submit it, but should be invisible
            form.hidden = true
            document.body.append(form)

            form.submit()
        }
    }

    ratingRequest.open("GET", "https://www.omdbapi.com/?i=" + imdbID + "&apikey=b50af808&tomatoes=true")
    ratingRequest.send()
}

//hide suggestions when search field loses focus
function hideSuggestions() {
    $('.results').delay(200).hide(0)
}