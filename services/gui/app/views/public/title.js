//prepare modal to delete a title
export function prepareDeleteModal(name, id) {
  //set name of modal
  $("#deleteModalName").text(name);
  //set action to id of title
  $("#deleteModalForm").attr("action", "/title/" + id + "/?_method=DELETE");
  //show delete modal
  $("#deleteModal").modal("show");
}

//clicking the magnifier activates the search bar
export function activateSearchBar() {
  $("#searchNewTitle").focus();
}

//update a title as seen or unseen
export function toggleSeenStatus(id, name, seen) {
  let form = document.createElement("form");
  form.action = "/title/" + id + "/?_method=PUT";
  form.method = "POST";
  if (seen) {
    form.innerHTML =
      '<input name="title[seen]" value="true"> <input name="title[seenOn]" value="' +
      Date.now() +
      '">';
  } else {
    form.innerHTML = '<input name="title[seen]" value="false">';
  }

  //the form must be in the document to submit it, but should be invisible
  form.hidden = true;
  document.body.append(form);

  form.submit();
}

//suggestions from IMDB (via omdb api) for adding a new title
//needs to be globally available
var omdbRequest = null;
export function suggestTitle() {
  var searchString = $("#searchNewTitle").val();
  if (searchString.length > 2) {
    //ask omdb to find a title based on the input provided
    omdbRequest = jQuery.ajax({
      type: "GET",
      url: `https://www.omdbapi.com/?s=${searchString}&apikey=b50af808`,
      beforeSend: function() {
        //if there is an unfinished request to omdb, abort it, to avoid overlapping responses
        if (omdbRequest != null) {
          omdbRequest.abort();
        }
      },
      success: function(response) {
        if (response.Response === "True" && response.Search.length > 0) {
          const results = $("#results");
          //clear suggestion list
          results.html("");
          for (let suggestion of response.Search) {
            //some titles have no cover and some covers are hosted at imdb, seems like they don't allow external usage of those, we replace those with a default one
            if (
              suggestion.Poster === "N/A" ||
              suggestion.Poster.includes("media-imdb.com") ||
              suggestion.Poster.includes("images-na")
            ) {
              suggestion.Poster = "/nocover.png";
            }
            //build string for suggestion
            let suggestionHtml = renderSuggestion(suggestion);
            results.append(suggestionHtml);
            results
              .children()
              .last()
              .click(() => onSuggestionSelected(suggestion));
          }
          results.show();
        }
      },
      error: function(err, errText) {
        //aborting a request also calls the error function - crazy people
        if (errText != "abort") {
          console.log(`ERR: oMDB failed us, here is the reason: ${errText}`);
          $("#results").html(
            "<p style='padding:5px;'> 😰ooops we can't get results from iMDB, please notify us!</p>"
          );
          $("#results").show();
        }
      }
    });
  } else {
    $("#results").hide(0);
  }
}

const renderSuggestion = suggestion => {
  const bIsInWatchlist = isInWatchList(suggestion);
  return `
  <div class="suggestion flex-parent">
      <div class="flex-child short-and-fixed my-auto d-flex">
          <a ${
            bIsInWatchlist ? `href='#watch-list-item-${suggestion.imdbID}'` : ""
          } class=" my-auto ml-2">
            <i class="fas ${
              bIsInWatchlist
                ? "fa-arrow-alt-circle-down text-secondary"
                : "fa-plus-circle"
            } addSuggestionButton"></i>
          </a>
          <img loading="lazy" class="ml-2 my-auto" src="${
            suggestion.Poster
          }" width="33px" height="50px">
      </div>
      <div class="flex-child long-and-truncated-with-child my-auto ml-2">
          <h4 class="my-1">${suggestion.Title}</h4>
          <p class="text-muted my-1">(${suggestion.Year})</p>
      </div>
  </div>
  `;
};

const onSuggestionSelected = suggestion => {
  if (!isInWatchList(suggestion)) {
    addTitle(
      suggestion.Title,
      suggestion.imdbID,
      suggestion.Year,
      suggestion.Poster
    );
  }
};

export const isInWatchList = suggestion =>
  moveez.titles.some(title => title.imdbID === suggestion.imdbID);

//add a new title
export function addTitle(name, imdbID, year, poster, genres) {
  let form = document.createElement("form");
  form.action = "/title";
  form.method = "POST";

  var ratingRequest = new XMLHttpRequest();
  ratingRequest.onreadystatechange = function() {
    if (ratingRequest.readyState == 4 && ratingRequest.status == 200) {
      let genreArray = JSON.parse(ratingRequest.responseText).Genre.split(",");
      let genreInput = "";
      for (let i = 0; i < genreArray.length; i++) {
        genreInput += `<input name="title[genres][${i}]" value="${genreArray[i]}"></input>`;
      }

      form.innerHTML = `
                <input name="title[name]" value="${name}">
                <input name="title[tomatoURL]" value="${
                  JSON.parse(ratingRequest.responseText).tomatoURL
                }">
                <input name="title[imdbRating]" value="${
                  JSON.parse(ratingRequest.responseText).imdbRating
                }">
                <input name="title[imdbID]" value="${imdbID}">
                <input name="title[year]" value="${year}">
                <input name="title[poster]" value="${poster}">
                ${genreInput}
            `;
      //the form must be in the document to submit it, but should be invisible
      form.hidden = true;
      document.body.append(form);
      form.submit();
    }
  };

  ratingRequest.open(
    "GET",
    "https://www.omdbapi.com/?i=" + imdbID + "&apikey=b50af808&tomatoes=true"
  );
  ratingRequest.send();
}

//hide suggestions when search field loses focus
export function hideSuggestions() {
  setTimeout(function() {
    $("#results").hide(0);
  }, 200);
}
