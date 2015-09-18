(function($) {
  //initialize JSV when the pagecontainer is ready
  $('body').one('pagecontainershow', function(event, ui) {
    var loc = window.location,
        //if not already set, set the root schema location
        //this allows dev ENV to override the schema location
        schema = JSV.schema ? JSV.schema : loc.origin + loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1) + 'schemas/schema/schema.json';

    JSV.init({
      schema : schema
    }, function() {
      //initialize welcome popup
      var $popup = $('#popup-welcome').enhanceWithin().popup();

      //display schema version
      JSV.setVersion(tv4.getSchema(JSV.treeData.schema).version);
      //handle permalink
      if (window.jsvInitPath) {
        var node = JSV.expandNodePath(window.jsvInitPath.split('-'));

        JSV.flashNode(node);
        JSV.clickTitle(node);
      } else {
        JSV.resetViewer();
        //show popup
        $popup.popup('open');
      }
    });
  });
})(jQuery);
