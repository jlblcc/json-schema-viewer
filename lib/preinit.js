//If using JQM, you must handle permalinks *before* initializing JQM
(function($) {
  var hash = window.location.hash,
      path = hash.match(/v=([^\&]+)/);

  window.jsvInitPath = path ? path[1] : false;
  window.location.hash = hash.match(/#[^\?]+/) || '';
})(jQuery);