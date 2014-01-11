var eecQaPlugin = {};

eecQaPlugin.callApi = function(service, method, parameters, callback) {
  var url = eecQaPlugin.application + '/services/AMS/' + service + '/' + method;
  var data = { data: JSON.stringify(parameters) };
  if (!(service == 'Authentication' && method == 'Authenticate')) {
    data.token = eecQaPlugin.token['Token'];
  }
  $.get(url, data, function(response) {
    if (response['Status'] == 0) {
      if (typeof callback === 'function') { callback(response['Value']); }
    } else if (response['Status'] == 1) {
      alert('Error calling Cityworks API.  ' + response['Message']);
      if (typeof callback === 'function') { callback(); }
    } else if (response['Status'] == 2) {
      //TODO: Re-Authenticate?  Throw unauthorized error?  Does this happen when they just don't have permissions too?
    }
  });
};

eecQaPlugin.getStatusLabel = function(test) {
  var label;
  if (test.total > 0) {
    label = test.complete + ' / ' + test.total;
  } else {
    if (test.status == 'pass') {
      label = '\u2611';  //ballot box with check
    } else {
      label = '\u2610';  //blank ballot box
    }
  }
  return label;
};

eecQaPlugin.updateTestView = function(testName) {
  var test = eecQaPlugin.tests[testName];
  var statusView = $(eecQaPlugin.selector + ' #eec-qa-test-' + testName + ' label.eec-qa-status');
  statusView.text(eecQaPlugin.getStatusLabel(test));
  if (test.status == 'pass') {
    statusView
      .addClass('eec-qa-status-pass')
      .removeClass('eec-qa-status-fail')
    ;
  } else {
    statusView
      .addClass('eec-qa-status-fail')
      .removeClass('eec-qa-status-pass')
    ;
  }
};

eecQaPlugin.setTestResults = function(testName, status, complete, total) {
  var test = eecQaPlugin.tests[testName];
  test.status = status;
  if (complete != undefined) { test.complete = complete; }
  if (total) { test.total = total; }
  eecQaPlugin.updateTestView(testName);
};

eecQaPlugin.update = function(tests) {

  if (typeof tests === 'string') { tests = [tests]; }

  var updateTestByName = function(test) {
    eecQaPlugin.tests[test].update();
  };

  if (tests == undefined || tests == null) {
    // Nothing specified.  Update all.
    for (var test in eecQaPlugin.tests) {
      if (eecQaPlugin.tests.hasOwnProperty(test)) {
        updateTestByName(test);
      }
    }
  } else {
    // Tests specified.  Update by name.
    for (var i=0; i<tests.length; i++) {
      if (eecQaPlugin.tests.hasOwnProperty(tests[i])) {
        updateTestByName(tests[i]);
      }
    }
  }
  //TODO: Callback?
};

eecQaPlugin.init = function(params) {

  var authenticate = function(callback) {

    var authWithServer = function(callback) {
      eecQaPlugin.callApi('Authentication', 'Authenticate', eecQaPlugin['credentials'], function(data) {
        eecQaPlugin.token = data;
        localStorage.setItem('eec-qa-token', JSON.stringify(eecQaPlugin.token));  //TODO: Use sessionStorage instead?
        if (typeof callback === 'function') { callback(); }
      });
    };

    var tokenSave = localStorage.getItem('eec-qa-token');
    if (tokenSave == null) { //TODO: Need better error handling than this.  Basically, if anything goes not perfect,
                             // then re-auth with the server (i.e. don't assume the localStorage value isn't messed up)
      authWithServer(callback);
    } else {
      var token = JSON.parse(tokenSave);  //TODO: Check token with Authentication/Validate service
      if (token['Expires'] < new Date()) {  //TODO: Timezone check
        authWithServer(callback);
      } else {
        eecQaPlugin.token = token;
        if (typeof callback === 'function') { callback(); }
      }
    }
  };

  var build = function() {

    for (var testName in eecQaPlugin.tests) {
      if (eecQaPlugin.tests.hasOwnProperty(testName)) {
        var test = eecQaPlugin.tests[testName];
        $(eecQaPlugin.selector)
          .append($('<div id="eec-qa-test-' + testName + '" class="row" />')
            .append($('<label class="field label eec-qa-status" />')
              .text(eecQaPlugin.getStatusLabel(test))
            )
            .append($('<div class="field eec-qa-description" />')
              .text(test.description)
            )
          )
        ;
      }
    }

    eecQaPlugin.update(['tasks','labor', 'equipment', 'materials']); //TODO: Add others as they're finished.
  };

  eecQaPlugin.application = params['application'];
  eecQaPlugin.credentials = params['credentials'];
  eecQaPlugin.selector = params['selector'];

  authenticate(build);

};