
var hintkeys = widget.preferences.getItem('hintkeys');
var startkey = parseInt(widget.preferences.getItem('startkey'), 10);
var blacklist = widget.preferences.getItem('blacklist');
if (!blacklist) {
  blacklist = [];
} else {
  blacklist = JSON.parse(blacklist);
}

function isBlacklisted(url) {
  return blacklist.some(function(line) {
    var re = line.split('*').map(function(seg) {return seg.replace(/\W/g,'\\$&')}).join('.*');
    return !!url.match(re);
  });
}

window.addEventListener('storage', function(e) {
  if (e.key === 'hintkeys') {
    hintkeys = e.newValue;
  } else if (e.key === 'startkey') {
    startkey = parseInt(e.newValue, 10);
  } else if (e.key === 'blacklist') {
    blacklist = JSON.parse(e.newValue);
  }
}, false);

opera.extension.onmessage = function(e) {
  if (e.data.action === 'load') {
    e.source.postMessage({
      action: 'load',
      hintkeys: hintkeys,
      startkey: startkey,
      blacklisted: isBlacklisted(e.data.url)
    });
  }
};
