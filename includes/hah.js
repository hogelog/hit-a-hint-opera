const CODE_SHIFT = 1000;
const CODE_CTRL = 10000;
const CODE_ALT = 100000;
const CODE_RETURN = 13;
var hintkeys = 'asdfghjkl';
var startkey = 102;
var tabkey = 70 + CODE_SHIFT;
var blacklisted = false;
var startKeys = [];

opera.extension.postMessage({action:'load', url: window.location.href});
opera.extension.onmessage = function(e){
  if (e.data.action === 'load') {
    if (e.data.hintkeys) hintkeys = e.data.hintkeys;
    if (e.data.startkey) startkey = e.data.startkey;
    if (e.data.tabkey) tabkey = e.data.tabkey;
    if (e.data.blacklisted) blacklisted = e.data.blacklisted;
  }
  startKeys.push(startkey);
  startKeys.push(tabkey);
};

function getKey(e){
  return e.altKey * CODE_ALT + e.ctrlKey * CODE_CTRL + e.shiftKey * CODE_SHIFT + e.keyCode;
}


window.addEventListener('keypress', function(evt){
  if (blacklisted) return;
  function createText(num) {
    var text = '', l = hintkeys.length, iter = 0;
    while (num >= 0) {
      var n = num;
      num -= Math.pow(l, 1 + iter++);
    }
    for (var i = 0; i < iter; i++) {
      r = n % l;
      n = Math.floor(n / l);
      text = hintkeys.charAt(r) + text;
    }
    return text;
  }
  function retrieveNumber(text) {
    text += '';
    for (var i=0,n=0,l=text.length; i<l; i++) {
      var fix = (i == 0) ? 0 : 1;
      var t = text.charAt(l - i - 1);
      n += (hintkeys.indexOf(t) + fix) * Math.pow(hintkeys.length, i);
    }
    return n;
  }
  var compat = document.compatMode === 'BackCompat';
  var Root = compat ? document.body : document.documentElement;
  var rootHeight = Root.clientHeight;
  var rootWidth = Root.clientWidth;
  var yScroll = window.pageYOffset;
  var xScroll = window.pageXOffset;
  function getAbsolutePosition(elem) {
    var rect;
    if (rect=getRectInViewport(elem)){
      return {
        y: yScroll + rect.top,
        x: xScroll + rect.left
      }
    }
    return null;
  }
  function hasTextBeforeImage(elem, img) {
    var r = document.createRange();
    r.setStart(elem,0);
    r.setEndBefore(elem.firstElementChild);
    return /\S/.test(r.cloneContents().textContent);
  }
  function getRectInViewport(elem) {
    if (elem.childElementCount === 1 && elem.firstElementChild instanceof window.HTMLImageElement && !hasTextBeforeImage(elem, elem.firstElementChild)){
      elem = elem.firstElementChild;
    }
    var rect = elem.getClientRects()[0];
    if (!rect) return null;
    /*can't use window.innerWidth/Height since it breaks when zoomed*/
    if (rect.left < 0 || rect.left > rootWidth || rect.top < 0 || rect.top > rootHeight) return null;
    var e = document.elementFromPoint(rect.left, rect.top);
    if (e && (e === elem || elem.contains(e))) return rect;
    return null;
  }
  function num(s) {
    return parseFloat(s) || 0;
  }
  var tabopen = false;
  var hints = [];
  function drawHints() {
    var body = window.getComputedStyle(document.body);
    var html = window.getComputedStyle(document.documentElement);
    var staticBody = body.position == "static";
    var top = num(html.top);
    var left = num(html.left);
    if(!staticBody){
      top += num(body.top)
      left += num(body.left)
    }
    if(!compat){
      top += num(html.marginTop) + num(html.paddingTop);
      left += num(html.marginLeft) + num(html.paddingLeft);
      if(!staticBody){
        top += num(body.marginTop) + num(body.paddingTop);
        left += num(body.marginLeft) + num(body.paddingLeft);
      }
    }
    var elems = document.querySelectorAll('a[href],*[onclick],input:not([type="hidden"]),textarea,button,select');
    var df = document.createDocumentFragment();
    var count = 0;
    Array.prototype.forEach.call(elems,function(elem){
      var pos = getAbsolutePosition(elem);
      if (pos) {
        var span = document.createElement('span');
        span.setAttribute('style',[
          'font-size:10pt;',
          'padding:0pt 1pt;',
          'margin:0;',
          'line-height:10pt;',
          'position:absolute;',
          'z-index:2147483647;',
          'opacity:.7;',
          'color:#000;',
          'background-color:#FF0;',
          'left:', Math.max(0,pos.x-8)-left, 'px;',
          'top:', Math.max(0,pos.y-8)-top, 'px;',
        ].join(''));
        span.textContent = createText(count++);
        df.appendChild(span);
        hints.push({
          elem : elem,
          label : span,
          text : span.textContent,
        });
      }
    });
    if (!hints.length) return;
    var div = document.createElement('div');
    div.setAttribute('id', 'HaH-div-element');
    div.setAttribute('style', 'position:static;'); // for BitBucket
    div.appendChild(df);
    document.body.appendChild(div);
  }
  var choice = '', choiceHint;
  function pushLetter(key, e){
    var hint = hints[retrieveNumber(choice+key)];
    if (hint){
      choice += key;
      var lastHint = hints[hints.length - 1].text;
      hint.label.style.backgroundColor = '#ff00ff';
      focus(hint.elem);
      e.preventDefault();
      if (choiceHint) {
        choiceHint.label.style.backgroundColor = '#ffff00';
      }
      choiceHint = hint;
    } else {
      unloadHaH();
    }
  }
  function focus(elem){
    if (!elem.id) elem.id = 'HaH-temp';
    var a = document.createElement('a');
    a.href = '#';
    a.style = 'position:fixed;width:1px;height:1px;top:0;left:0;nav-right:#' + elem.id;
    document.body.appendChild(a);
    a.focus();
    document.moveFocusRight();
    document.body.removeChild(a);
    if (elem.id === 'HaH-temp') elem.id = '';
  }
  function unloadHaH(){
    if (choiceHint) choiceHint.label.style.backgroundColor = '#FF0';
    choice = '';
    var div = document.getElementById('HaH-div-element');
    if (div) div.parentNode.removeChild(div);
    document.removeEventListener('keypress',handler,true);
    document.removeEventListener('focus',focusFix,true);
  }
  function handler(e){
    var code = e.keyCode;
    var key = String.fromCharCode(code);
    if (hintkeys.indexOf(key) >= 0) return pushLetter(key, e);
    else if (code == CODE_RETURN) {
      e.preventDefault();
      var openEvent = document.createEvent('MouseEvent');
      console.log(tabopen);
      openEvent.initMouseEvent('click', null, null, window, 1, 0, 0, 0, 0, tabopen, false, false, false, 0, null);
      e.target.dispatchEvent(openEvent);
      console.log(openEvent);
    }
    unloadHaH();
  }
  function initHaH(){
    drawHints();
    document.addEventListener('keypress',handler,true);
    document.addEventListener('focus',focusFix,true);
  }
  function focusFix(e){
    /*Opera doesn't fire keydown, keypress nor keyup when focusing on an input(able) element*/
    if (isInputable(e.target)) unloadHaH();
  }
  function isInputable(t){
    return (t instanceof window.HTMLTextAreaElement || (t instanceof window.HTMLInputElement && (!t.type || /^(text|password|search|tel|url|email|number)$/i.test(t.type))));
  }
  function init(){
    var keyid = getKey(evt);
    var target = evt.target;
    if (startKeys.indexOf(keyid) != -1 && !document.getElementById('HaH-div-element')) {
      tabopen = keyid == tabkey;
      console.log(tabopen);
      if (keyid >= CODE_CTRL || !isInputable(target)) {
        evt.preventDefault();
        return initHaH();
      }
      if (target instanceof window.HTMLTextAreaElement) {
        var rect = target.getClientRects()[0];
        if (rect.bottom < 0 || rect.top > rootHeight || rect.right < 0 || rect.left > rootWidth) {
          /* rect is completely out of viewport */
          evt.preventDefault();
          return initHaH();
        }
      } else if (target instanceof window.HTMLInputElement) {
        var rect = target.getClientRects()[0];
        if (rect.top < 0 || rect.bottom > rootHeight || rect.left < 0 || rect.right > rootWidth) {
          /* rect is only partially in viewport */
          evt.preventDefault();
          return initHaH();
        }
      }
      /* check if the target is just "focused" by spatial navigation, or "focused" in the sense that you are ready to start typing */
      var inputReady = true;
      var onfocus = function (e){/* the form element was not input-ready */
        e.preventDefault();
        inputReady = false;
        setTimeout(function(){target.blur();},10);
      };
      target.addEventListener('focus', onfocus, false);
      target.focus(); /* focus event fires synchronously */
      target.removeEventListener('focus', onfocus, false);
      if (!inputReady){
        evt.preventDefault();
        return initHaH();
      }
    }
  }
  init();
}, false);
