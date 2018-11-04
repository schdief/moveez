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
    'search' : 'http://www.omdbapi.com/?s={value}&apikey=b50af808'
};
$('.search input')
  .api({
    debug: true,
    action: 'search',
    searchFullText: false,
    stateContext: '.ui.input',
    onSuccess: function(response) {
         if(response.Search.length > 0) {
             $('.results').html("")
             for(i = 0; response.Search.length > i; i++) {
                //TODO: get year in a second line and make title bold
                $('.results').append("<div class=\"suggestion item\"><button onclick=\"addTitle('" + response.Search[i].Title + "', '" + response.Search[i].imdbID + "', '" + response.Search[i].Year + "', '" + response.Search[i].Poster + "')\" class=\"ui icon teal button\" id=\"add\"><i class=\"add circle icon\"></i></button><img class=\"suggestionPoster\" src=\"" + response.Search[i].Poster + "\" width=\"30px\" height=\"44px\"><span class=\"suggestionContent\">" + response.Search[i].Title + " (" + response.Search[i].Year +  ")</span></div>")
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
            imdbRating = JSON.parse(ratingRequest.responseText).imdbRating

            form.innerHTML = '<input name="title[name]" value="' + name + '"><input name="title[imdbRating]" value="' + imdbRating + '"><input name="title[imdbID]" value="' + imdbID + '"><input name="title[year]" value="' + year + '"><input name="title[poster]" value="' + poster + '">'

            //the form must be in the document to submit it, but should be invisible
            form.hidden = true
            document.body.append(form)

            form.submit()
        }
    }

    ratingRequest.open("GET", "http://www.omdbapi.com/?i=" + imdbID + "&apikey=b50af808")
    ratingRequest.send()
}

//hide suggestions when search field loses focus
function hideSuggestions() {
    $('.results').delay(200).hide(0)
}