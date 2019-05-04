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

//suggestions from IMDB (via omdb api) for adding a new title
function suggestTitle() {
    var searchString = $('.search input').val()
    if(searchString.length > 2) {
        superagent.get(`https://www.omdbapi.com/?s=${searchString}&apikey=b50af808`)
        .end((err, response) => {
            if (err) {
                console.log(`ERR: oMDB failed us, here is the reason: ${err}`)
                $('.results').html("<p style='padding:5px;'> 😰ooops we can't get results from iMDB, please notify us! </p>")
                $('.results').show()
            } else {
                if(response.body.Search) {
                    $('.results').html("")
                    for (let suggestion of response.body.Search) {
                        //some titles have no cover and some covers are hosted at imdb, seems like they don't allow external usage of those, we replace those with a default one
                        if(suggestion.Poster === "N/A" || suggestion.Poster.includes("media-imdb.com")) {
                            suggestion.Poster = "/nocover.png"
                        }
                        //some titles are too long and mess with the layout (names don't show up because they are behind the other suggestions)
                        var titleDisplayName
                        if(suggestion.Title.length > 40) {
                            titleDisplayName = suggestion.Title.substring(0, 37) + "..."
                        } else {
                            titleDisplayName = suggestion.Title
                        }
                        $('.results').append("<div class=\"suggestion item\" onclick=\"addTitle('" + suggestion.Title + "', '" + suggestion.imdbID + "', '" + suggestion.Year + "', '" + suggestion.Poster + "')\"><button class=\"ui icon teal button\" id=\"add\"><i class=\"add circle icon\"></i></button><img class=\"suggestionPoster\" src=\"" + suggestion.Poster + "\" width=\"30px\" height=\"44px\"><div class=\"suggestionContent\"><h4>" + titleDisplayName + "</h4>(" + suggestion.Year +  ")</div></div>")
                    }
                    $('.results').show()
                }
            }
        })
    } else {
        $('.results').hide(0)
    }
}

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
    $('.results').delay(20000).hide(0)
}