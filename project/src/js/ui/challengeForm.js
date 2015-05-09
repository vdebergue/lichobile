var helper = require('./helper');
var utils = require('../utils');
var xhr = require('../xhr');
var settings = require('../settings');
var session = require('../session');
var formWidgets = require('./widget/form');
var popupWidget = require('./widget/popup');
var i18n = require('../i18n');
var backbutton = require('../backbutton');

var challengeForm = {
  actionName: '',
  userId: null,
  isOpen: false
};

challengeForm.open = function(userId) {
  if (userId) {
    helper.analyticsTrackView('Challenge Friend popup');
    challengeForm.userId = userId;
    challengeForm.actionName = i18n('challengeToPlay');
  } else {
    helper.analyticsTrackView('Invite Friend popup');
    challengeForm.userId = null;
    challengeForm.actionName = i18n('playWithAFriend');
  }
  backbutton.stack.push(challengeForm.close);
  challengeForm.isOpen = true;
};

challengeForm.close = function(fromBB) {
  if (fromBB !== 'backbutton' && challengeForm.isOpen) backbutton.stack.pop();
  challengeForm.isOpen = false;
};

function invite() {
  var userId = challengeForm.userId;
  return xhr.inviteFriend(userId).then(function(data) {
    var url = `/game${data.url.round}`;
    if (userId) url += `/user/${userId}`;
    m.route(url);
  }, function(error) {
    utils.handleXhrError(error);
    throw error;
  });
}

function renderForm() {
  var formName = 'invite';
  var settingsObj = settings.game.invite;
  var variants = settings.game.invite.availableVariants;
  var timeModes = settings.game.invite.availableTimeModes;
  var timeMode = settingsObj.timeMode();
  var hasClock = timeMode === '1';
  var hasDays = timeMode === '2';

  // if mode is rated only allow random color for three-check, atomic, antichess
  // horde variants
  var colors;
  if (settingsObj.mode() === '1' &&
    ['5', '6', '7', '8'].indexOf(settingsObj.variant()) !== -1) {
    settingsObj.color('random');
    colors = [
      ['randomColor', 'random']
    ];
  } else
    colors = [
      ['randomColor', 'random'],
      ['white', 'white'],
      ['black', 'black']
    ];

  var modes = session.isConnected() ? [
    ['casual', '0'],
    ['rated', '1']
  ] : [
    ['casual', '0']
  ];

  var generalFieldset = [
    m('div.select_input', {
      key: formName + 'color'
    }, [
      formWidgets.renderSelect('side', formName + 'color', colors, settingsObj.color)
    ]),
    m('div.select_input', {
      key: formName + 'variant'
    }, [
      formWidgets.renderSelect('variant', formName + 'variant', variants, settingsObj.variant)
    ]),
    m('div.select_input', {
      key: formName + 'mode'
    }, [
      formWidgets.renderSelect('mode', formName + 'mode', modes, settingsObj.mode)
    ])
  ];

  var timeFieldset = [
    m('div.select_input', {
      key: formName + 'timeMode'
    }, [
      formWidgets.renderSelect('clock', formName + 'timeMode', timeModes, settingsObj.timeMode)
    ])
  ];

  if (hasClock) {
    timeFieldset.push(
      m('div.select_input.inline', {
        key: formName + 'time'
      }, [
        formWidgets.renderSelect('time', formName + 'time',
          settings.game.availableTimes.map(utils.tupleOf), settingsObj.time, false)
      ]),
      m('div.select_input.inline', {
        key: formName + 'increment'
      }, [
        formWidgets.renderSelect('increment', formName + 'increment',
          settings.game.availableIncrements.map(utils.tupleOf), settingsObj.increment, false)
      ])
    );
  }

  if (hasDays) {
    timeFieldset.push(
      m('div.select_input.large_label', {
        key: formName + 'days'
      }, [
        formWidgets.renderSelect('daysPerTurn', formName + 'days',
          settings.game.availableDays.map(utils.tupleOf), settingsObj.days, false)
      ]));
  }

  return m('form#invite_form.game_form', {
    onsubmit: function(e) {
      e.preventDefault();
      if (!settings.game.isTimeValid(settingsObj)) return;
      challengeForm.close();
      invite();
    }
  }, [
    m('fieldset', generalFieldset),
    m('fieldset#clock', timeFieldset),
    m('fieldset', [
      m('button[data-icon=E][type=submit]', challengeForm.actionName)
    ])
  ]);
}

challengeForm.view = function() {
  return popupWidget(
    'invite_form_popup game_form_popup',
    null,
    renderForm(),
    challengeForm.isOpen,
    challengeForm.close
  );
};

module.exports = challengeForm;