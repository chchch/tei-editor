'use strict';

var vetala = (function() {

const state = {
    editor: null,
    filename: null,
    xmlDoc: null,
    xmlTxt: null,
    xml_div: null,
    xml_folio: null,
    prevcontents: null,
    pblocations: null,
    view: 'folio',
    script: 'iast',
}

const init = function() {

    document.getElementById('file').addEventListener('change',fileSelect,false);
    document.getElementById('newfile').addEventListener('click',newFile);
    //scriptselect = document.getElementById('scriptselect')
    //scriptselect.value = 'iast';
    //scriptselect.addEventListener('change',scriptSelect);
}

const fileSelect = function(e) {
    const file = e.target.files[0];
    state.filename = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
      state.xmlDoc = parseXMLString(e.target.result);
      displayXML(state.xmlDoc);
      document.body.addEventListener('click',bodyClick);
      document.getElementById('topmenu').addEventListener('mouseover',menuMouseover);
      document.getElementById('topmenu').addEventListener('mouseout',menuMouseout);
      document.getElementById('scriptselect').addEventListener('click',scriptSelect);
    };
    reader.readAsText(file);
}

const newFile = function() {
    state.filename = 'new.xml';
    const xmlDoc = parseXMLString(tei_template);
    state.xmlDoc = xmlDoc;
    displayXML(state.xmlDoc);
    document.body.addEventListener('click',bodyClick);
    initHeaderEditor();
}

const parseXMLString = function(file) {
    const xmlParser = new DOMParser();
    const newXmlDoc = xmlParser.parseFromString(file,'text/xml');
    if(newXmlDoc.documentElement.nodeName == 'parsererror')
        alert('XML errors!');
    else
        return newXmlDoc;

}

const bodyClick = function(e) {
    const classes = e.target.classList;

    if(e.target.id === 'headeredit')
        initHeaderEditor();

    else if(classes.contains('editbutton'))
        (state.view === 'folio') ?
            initEditor(e.target.dataset.n) :
            initEditorDiv(e.target.closest('div'));

    else if(classes.contains('viaf_search'))
        viafSearch(e.target);
    
    else if(classes.contains('pancanga'))
        pancangaSearch();

    else if(e.target.id === 'updateheader')
        updateHeader();

    else if(e.target.id === 'cancelheader')
        destroyHeaderEditor();

    else if(e.target.id === 'cancelbutton')
        destroyEditor();

    else if(e.target.id === 'updatebutton')
        (state.view === 'folio') ?
            saveEdit() :
            saveEditDiv();

    else if(e.target.id === 'appendbutton')
        appendFolio();

    else if(e.target.id === 'saveasbutton')
        saveAs();
    else if(e.target.id === 'storyview')
        changeView();
}

const changeView = function() {
    const middle = inViewport(document.getElementById('teiheader')) ?
        null :
        findMiddleElement();

    switch (state.view) {
        case 'folio':
           state.view = 'story';
           break;

        default:
            state.view = 'folio';
    }
    renderMenu();
    renderBody(state.xmlDoc);
    setViewPos(middle);
}

const XSLTransform = function(xslsheet,node) {
    const xslt_processor = new XSLTProcessor();
    xslt_processor.importStylesheet(xslsheet);

    return xslt_processor.transformToFragment(node,document);
}

const displayXML = function(xmlDoc) {

    // Render top row of buttons

    renderMenu();

    // Render TEI header
    
    renderHeader(xmlDoc);

    // Render TEI body text
    
    renderBody(xmlDoc);

    // Split the body text into folios
    
    state.xmlTxt = xmlDoc.documentElement.outerHTML;
    splitSections(state.xmlTxt);
}

const renderMenu = function() {
    const topbuttons = document.getElementById('topbuttons');
    const storytxt = (state.view === 'story') ? 'view as folios' : 'view as running text';

    topbuttons.querySelector('#storyview').innerHTML = storytxt;
    topbuttons.style.display = 'block';

}

const splitSections = function(xmlTxt) {
    const regex = RegExp('<pb\\s+n=[\'"](\\w+)[\'"].*\/>','g');
    var pblocations = [];
    var results;
    while( (results = regex.exec(xmlTxt)) !== null) {
        pblocations.push({n: results[1], loc: results.index});
    }
    
    pblocations.push({n: null, loc: xmlTxt.indexOf('</body>')});

    state.pblocations = pblocations;
}

const renderHeader = function(xmlDoc) {
    const teiheader = document.getElementById('teiheader');
    const headerfragment = XSLTransform(
            document.getElementById('tei_header_style').contentDocument,
            xmlDoc.getElementsByTagName('teiHeader')[0]
    );
    
    teiheader.innerHTML = '';
    teiheader.appendChild(headerfragment);
    
}

const renderBody = function(xmlDoc) {
    const HTMLbody = document.getElementById('teibody');
    const XMLbody = xmlDoc.getElementsByTagName('body')[0];

    HTMLbody.innerHTML = '';

    if(state.view === 'story') 
        renderBodyStory(HTMLbody,XMLbody);
    else
        renderBodyFolios(HTMLbody,XMLbody);

    if(state.script !== 'iast') {
        let teibody = document.getElementById('teibody');
        teibody.parentElement.replaceChild(
            changeScript(teibody,state.script),
            teibody);
    }
}

const renderBodyFolios = function(HTMLbody,XMLbody) {
    const bodyXSLT = document.getElementById('tei_body_style').contentDocument;
    const bodyfragment = XSLTransform(bodyXSLT,XMLbody);

    HTMLbody.style.paddingLeft = '0';
    HTMLbody.style.paddingRight = '0';
    HTMLbody.style.textAlign = 'left';
    HTMLbody.appendChild(bodyfragment);

    const lasthr = document.createElement('hr');
    lasthr.setAttribute('data-n','_last');
    const appendform = document.createRange().createContextualFragment(
`<form id = "appendform" lang="en" class="buttoncontainer row">
<button type="button" id="appendbutton">new folio</button>
</form> `);
    HTMLbody.appendChild(lasthr);
    HTMLbody.appendChild(appendform);
}

const renderBodyStory = function(HTMLbody,XMLbody) {
    const bodyXSLT = document.getElementById('tei_body_style_divs').contentDocument;
    const bodyfragment = XSLTransform(bodyXSLT,XMLbody);

    const firsthr = document.createElement('hr');
    firsthr.setAttribute('data-n','_first');
    firsthr.style.marginLeft = '-80px';
    firsthr.style.width = 'calc(100% + 160px)';
    HTMLbody.appendChild(firsthr);
    
    HTMLbody.style.paddingLeft = '80px';
    HTMLbody.style.paddingRight = '80px';
    HTMLbody.style.textAlign = 'justify';
    HTMLbody.appendChild(prettyPrint(bodyfragment));
}

const saveAs = function() {
    const file = new Blob([state.xmlTxt], {type: 'text/xml'});
    const fileURL = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = fileURL;anchor.target = '_blank';
    anchor.download = state.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

const getSchema = function() {
    const custom = ['storyStart','storyEnd','verseStart','verseEnd','frameStart','frameEnd'];
    const layout = ['pb','lb','fw','space']; // no divs anymore
    const emendations = ['add','del','subst'];
    const difficult = ['unclear','damage'];

    const tags = {
        "!top": [...layout, ...emendations, ...difficult, ...custom],
        "!attrs": {
        },

        // Text division & Page layout
        pb: {
            attrs: {
                n: null,
                facs: null,
                '/': null,
            }
        },
        lb: {
            attrs: {
                n: null,
                '/': null,
            }
        },
        fw: {
            attrs: {
                type: ['pageNum', 'header', 'footer'],
                place: ['above','below','left','right','top','bottom','margin'],
            },
            children: [...layout, ...emendations],
        },
        /*
        div: {
            attrs: {
                type: ['frame','story','verse'],
                id: null,
            },
            children: [...layout, ...emendations],
        },
        */
        space: {
            attrs: {
                quantity: null,
                rend: ['overline','dash'],
                '/': null,
            }
        },

        // Text emendations

        add: {
            attrs: {
                rend: ['caret','above','below'],
                place: ['above','below','left','right','top','bottom','margin'],
            },
            children: [...emendations, ...difficult],
        },
        del: {
            attrs: {
                rend: ['overstrike','understrike','strikethrough','scribble'],
            },
            children: [...emendations, ...difficult],
        },
        subst: {
            attrs: {
                type: ['transpose'],
            },
            children: ['add','del'],
        },

        // Difficult or missing text
        unclear: {
            attrs: {
                reason: ['blemish','rubbed','messy'],
            }
        },
        damage: {
            attrs: {
                reason: ['torn','hole'],
                quantity: null,
            },
        },

        storyStart: {
            attrs: {
                n: null,
                '/>': null,
            },
        },
        storyEnd: {
            attrs: {
                '/>': null,
            },
        },
        verseStart: {
            attrs: {
                n: null,
                '/>': null,
            },
        },
        verseEnd: {
            attrs: {
                '/>': null,
            },
        },
        frameStart: {
            attrs: {
                n: null,
                '/>': null,
            },
        },
        frameEnd: {
            attrs: {
                '/>': null,
            },
        },
    };

    return tags;
}

const prettyPrint = function(el) {
    const node = el.cloneNode(true);
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
        let data = walker.currentNode.data;
        data = data.replace(/^[\s\uFEFF\xA0-]+/g,'');
        let rtrim = data.replace(/[\s\uFEFF\xA0]+$/g,'');
        if(rtrim.slice(-1) === '-')
            data = rtrim.slice(0,-1);
        else if(rtrim.slice(-2) === '-\\')
            data = rtrim.slice(0,-2) + '\\';
        data = data.replace(/[\s\uFEFF]+(?=\|)/g,'\xA0');
        data = data.replace(/\|\s+(?=\d+)/g,'|\xA0');
        if(walker.currentNode.parentNode === node ||
           walker.currentNode.parentNode.classList.contains('verse') ||
           walker.currentNode.parentNode.classList.contains('story') ||
           walker.currentNode.parentNode.classList.contains('fw')) {
            data = window['Hypher']['languages']['sa'].hyphenateText(data);
        }
        walker.currentNode.data = data;
    }
    return node;
}

const changeScript = function(orignode,script,placeholder = false,cur_lang="sa") {
    const func = to[script];
    const node = orignode.cloneNode(true);
    var cur_lang;

    
    function loop(node,cur_lang) { 
        let kids = node.childNodes;

        for(let kid of kids) {
            
            if(kid.nodeType === 8) continue;

            if(kid.nodeType === 3) {
                if(cur_lang !== 'sa')
                    continue;
                else
                    kid.data = func(kid.data,placeholder);
            }
            else if(kid.hasChildNodes()) {
                let kidlang = kid.getAttribute('lang') || cur_lang;
                if(kidlang === 'sa' && kid.classList.contains('subst'))
                    jiggle(kid,script);
                loop(kid,kidlang);
            }
        }
    } //end function loop

    loop(node,cur_lang);
    return node;
}

const jiggle = function(node,script) {
    if(node.firstChild.nodeType !== 3 && node.lastChild.nodeType !== 3) 
        return;

    const kids = node.childNodes;
    //const vowels = ['ā','i','ī','u','ū','e','ê','o','ô','ṃ','ḥ','ai','au','aî','aû'];
//    const vowels_regex = /[aāiīuūeoṛṝḷṃḥ_]$/;
    const starts_with_vowel = /^[aāiīuūeêoôṛṝḷṃḥ]/;
    const ends_with_consonant = /[kgṅcjñṭḍṇtdnpbmyrlvṣśsh]$/;

    const telugu_vowels = ['ā','i','ī','e','o','_','ai','au'];
    const telu_cons_headstroke = ['h','k','ś','y','g','gh','c','ch','jh','ṭh','ḍ','ḍh','t','th','d','dh','n','p','ph','bh','m','r','ḻ','v','ṣ','s'];
    var telugu_del_headstroke = false;
    var telugu_kids = [];
    //const initial_vowels_allowed = (kids[0].nodeType !== 3) ? true : false;
    var add_at_beginning = [];
    const starts_with_text = (kids[0].nodeType === 3);
//    const ends_with_text = (kids[kids.length-1].nodeType === 3);

    for (const kid of kids) {
        if(kid.nodeType > 3) continue;

        const txt = kid.textContent.trim();
        if(txt === '') continue;
        if(txt === 'a') { 
            kid.textContent = '';
            continue;
        }

        if(txt.match(ends_with_consonant)) {
        // add 'a' if node ends in a consonant
            const last_txt = findTextNode(kid,true);
            last_txt.textContent = last_txt.textContent.replace(/\s+$/,'') + 'a';
            if(script === 'telugu' &&
               telu_cons_headstroke.indexOf(txt) >= 0) {
                console.log(kid);
                // if there's a vowel mark in the substitution, 
                // remove the headstroke from any consonants
                telugu_kids.push(kid);
            }
        }
        
        // case 1, use aalt:
        // ta<subst>d <del>ip</del><add>it</add>i</subst>
        // case 2, use aalt:
        // <subst>d <del>apy </del><add>ity </add>i</subst>va
        // case 3, no aalt:
        // <subst><del>apy </del><add>ity </add>i</subst>va
        
        // use aalt if node is a text node or 
        // if it starts with a vowel
        if(kid === node.lastChild && kid.nodeType === 3) {
            const cap = document.createElement('span');
            cap.appendChild(kid.cloneNode(false));
            node.replaceChild(cap,kid);
            kid = cap; // redefines 'kid'
            kid.classList.add('aalt');
        }

        else if(starts_with_text && txt.match(starts_with_vowel))
            kid.classList.add('aalt');
        
        switch (script) {
            case 'devanagari':
                if(txt === 'i') 
                    add_at_beginning.unshift(kid);
                else if(txt === 'ê') {
                    kid.classList.remove('aalt');
                    kid.classList.add('cv01');
                    add_at_beginning.unshift(kid);
                }
                else if(txt === 'ô') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('ô','ê',new_e);
                    new_e.classList.remove('aalt');
                    new_e.classList.add('cv01');
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('ô','ā',kid);
                }
                else if(txt === 'aî') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('aî','ê',new_e);
                    new_e.classList.remove('aalt');
                    new_e.classList.add('cv01');
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('aî','e',kid);
                }
                else if(txt === 'aû') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('aû','ê',new_e);
                    new_e.classList.remove('aalt');
                    new_e.classList.add('cv01');
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('aû','o',kid);
                }
                break;
            case 'grantha':
            case 'malayalam':
                if(txt === 'e' || txt === 'ai') 
                    add_at_beginning.unshift(kid);
                else if(txt === 'o') {
                    const new_e = kid.cloneNode(true);
                    replaceTextInNode('o','e',new_e);
                    add_at_beginning.unshift(new_e);
                    replaceTextInNode('o','ā',kid);
                }
                break;
            case 'telugu':
                if(!telugu_del_headstroke &&
                   telugu_vowels.indexOf(txt) >= 0)
                    
                    telugu_del_headstroke = true;
                break;

        }
    } // end for let kid of kids

    for (const el of add_at_beginning) {
        node.insertBefore(el,node.firstChild);
    }

    if(telugu_del_headstroke) {
        for (const el of telugu_kids) {
            const lasttxtnode = findTextNode(el,true);
            lasttxtnode.textContent = lasttxtnode.textContent + '\u200D\u0C4D';
        }
    }
}

const findTextNode = function(node,last = false) {
    if(node.nodeType === 3) return node;
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null,false);
    if(!last) return walker.nextNode;
    else {
        let txt;
        while(walker.nextNode())
            txt = walker.currentNode;
        return txt;
    }
}

const replaceTextInNode = function(text, replace, node) {
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null,false);
    while(walker.nextNode()) {
        let cur_txt = walker.currentNode.textContent;
        if(cur_txt.match(text))
            walker.currentNode.textContent = replace;
    }
}

const extractHTMLFolio = function(pb_n) {

    if(pb_n === '_last') {
        let appendform = document.getElementById('appendform');
        let start = appendform.previousSibling;
        let end = appendform.nextSibling;
        return {
            prevcontents: appendform.parentNode.removeChild(appendform),
            start: start,
            end: end
        };
    }
    
    const pbs = document.getElementsByTagName('hr');
    var start;
    var end = false;
    var next_is_end = false;

    for(let pb of pbs) {
        if(next_is_end) {
            end = pb;
            break;
        }
        else if(pb.dataset.n === pb_n) {
            start = pb;
            next_is_end = true;
        }

    }
    
    const range = document.createRange();
    range.setStartAfter(start);
    if(!end) {
        let body = document.getElementsByTagName('body')[0];
        range.setEnd(body,body.childNodes.length);
    }
    else
        range.setEndBefore(end);
    return {prevcontents: range.extractContents(),start: start,end: end};
}

const getNewFolio = function() {
    var new_folio;
    
    const pbs = document.querySelectorAll('h3[class="pb"]');
    if(pbs) {
        const last_pb = pbs[pbs.length-1].textContent.trim();
        
        const rv = (last_pb.slice(-1) ===  'v') ? 'r' : 'v';
        let page_no = parseInt(last_pb);
        
        if(isNaN(page_no))
            page_no = 'X';
        else if(rv === 'r')
            page_no++;
        
        
        new_folio = '<pb n="'+page_no+rv+'" facs=""/>\n';
    }
    else
        new_folio = '<pb n="Xr" facs=""/>\n';

    new_folio +=
`  <fw type="header" place="top left"></fw>
  <fw type="pageNum" place="left margin"></fw>
  <lb n="1"/>
`;
    
    const lbs = document.querySelectorAll('span[class="lb"]');
    if(lbs) {
        const lb_n = parseInt(lbs[lbs.length-1].textContent.trim());
        for(let n=2;n<=lb_n;n++) {
            new_folio = new_folio + '  <lb n="'+n+'"/>\n';
        }
    }
    new_folio +=
`  <fw type="footer" place="bottom right"></fw>
  <fw type="pageNum" place="right margin"></fw>
`;

    return new_folio;
}

const extractXMLFolio = function(pb_n) {
    var start_index, end_index, prevcontents;

    if(pb_n === '_last') {
       start_index = state.pblocations[state.pblocations.length - 1].loc;
       end_index = start_index;
       prevcontents = getNewFolio();
    }
    else {
        var next_is_end = false;

        for(let pbloc of state.pblocations) {
            if(next_is_end) {
                end_index = pbloc.loc;
                break;
            } 
            else if(pbloc.n === pb_n) {
                start_index = pbloc.loc;
                next_is_end = true;
            }
        }
        prevcontents = state.xmlTxt.substring(start_index,end_index);
    }

    return {start: start_index, end: end_index, prevcontents: prevcontents};
}

const saveEdit = function() {
    state.editor.save();
    const savetxt = document.getElementById('edit_in_place').value;
    const newtxt = state.xmlTxt.substring(0,state.xml_folio.start) + 
                 savetxt +
                 state.xmlTxt.substring(state.xml_folio.end);
    //state.xmlTxt  = newtxt;
    const xmlParser = new DOMParser();
    const newXmlDoc = xmlParser.parseFromString(newtxt,'text/xml');
    if(newXmlDoc.documentElement.nodeName === 'parsererror')
        alert('XML errors!');
    else {
        state.xmlTxt = newtxt;
        splitSections(newtxt);
        state.xmlDoc = newXmlDoc;
        renderBody(newXmlDoc);
    }
}

const saveEditDiv = function() {
    state.editor.save();
    const savetxt = document.getElementById('edit_in_place').value;
    const xmlParser = new DOMParser();
    const divfrag = xmlParser.parseFromString(savetxt,'text/xml');
    if(divfrag.documentElement.nodeName === 'parsererror')
        alert('XML errors!');
    else {
        const newdiv = state.xmlDoc.createRange().createContextualFragment(savetxt);
        state.xml_div.parentNode.replaceChild(newdiv,state.xml_div);
        state.xmlTxt  = state.xmlDoc.documentElement.outerHTML;
        splitSections(state.xmlTxt);
        renderBody(state.xmlDoc);
    }
}

const appendFolio = function() {
    initEditor('_last');
}

const destroyEditor = function() {
    const editor = document.getElementById('editor_form');
    if(!editor) return false;
    editor.parentNode.insertBefore(state.prevcontents,editor);
    editor.parentNode.removeChild(editor);
    state.prevcontents = null;
    return true;
}

const initEditor = function(pb_n) {
    
    destroyEditor();

    const xml_folio = extractXMLFolio(pb_n);
    state.xml_folio = xml_folio;
    const textarea = document.createElement('textarea');
    textarea.setAttribute('id','edit_in_place');
    const buttoncontainer = document.createRange().createContextualFragment(
        `<div class="buttoncontainer row">
            <button type="button" id="updatebutton">update</button>
            <button type="button" id="cancelbutton">cancel</button>
        </div>`);
    const form = document.createElement('form');
    form.setAttribute('id','editor_form');
    form.appendChild(textarea);
    form.appendChild(buttoncontainer);

    textarea.value = xml_folio.prevcontents;

    const html_folio = extractHTMLFolio(pb_n);
    state.prevcontents = html_folio.prevcontents;
    
    // this fixes things when you're cutting up a div
    if(html_folio.start.parentNode.getAttribute('id') === 'teibody') {
        html_folio.start.parentNode.insertBefore(form,html_folio.start.nextSibling);
    }
    else {
/*        let curNode;
        while(curNode = html_folio.start.nextSibling) {
            if(curNode.parentNode.getAttribute('id') == 'teibody')
                curNode.parentNode.insertBefore(form,curNode);
        }
        */
        html_folio.end.parentNode.insertBefore(form,html_folio.end);
    }
    initCodeMirror(textarea);
}

const findDivNum = function(targ) {
    const alldivs = document.getElementById('teibody')
                            .querySelectorAll('div.story, div.verse, div.para');
    for(let n=0;n<alldivs.length;n++) {
        if(alldivs[n] === targ)
            return n;
    }
}

const getXmlDiv = function(n) {
    const XMLbody = state.xmlDoc.getElementsByTagName('body')[0];
    const alldivs = XMLbody.querySelectorAll('div[type="verse"], div[type="story"], div[type="para"]');
    return alldivs[n];
}

const initEditorDiv = function(targ) {
    
    destroyEditor();
    const divnum = findDivNum(targ);
    const xmldiv = getXmlDiv(divnum);
    state.xml_div = xmldiv;
    const textarea = document.createElement('textarea');
    textarea.setAttribute('id','edit_in_place');
    const buttoncontainer = document.createRange().createContextualFragment(
        `<div class="buttoncontainer row">
            <button type="button" id="updatebutton">update</button>
            <button type="button" id="cancelbutton">cancel</button>
        </div>`);
    const form = document.createElement('form');
    form.setAttribute('id','editor_form');
    if(targ.classList.contains('story'))
        form.setAttribute('class','wider_editor story_editor');
    else
        form.setAttribute('class','wider_editor');
    form.appendChild(textarea);
    form.appendChild(buttoncontainer);
    
    textarea.value = xmldiv.outerHTML;

    targ.parentNode.insertBefore(form,targ);
    state.prevcontents = targ.parentNode.removeChild(targ);
    
    initCodeMirror(textarea);
}

const initCodeMirror = function(textarea) {

    function completeAfter(cm, pred) {
        var cur = cm.getCursor();
        if (!pred || pred()) setTimeout(function() {
          if (!cm.state.completionActive)
            cm.showHint({completeSingle: false});
        }, 100);
        return CodeMirror.Pass;
    }

    function completeIfAfterLt(cm) {
        return completeAfter(cm, function() {
          var cur = cm.getCursor();
          return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) == "<";
        });
    }

    function completeIfInTag(cm) {
        return completeAfter(cm, function() {
          var tok = cm.getTokenAt(cm.getCursor());
          if (tok.type === "string" && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1)) return false;
          var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
          return inner.tagName;
        });
    }

    state.editor = CodeMirror.fromTextArea(textarea, {
        mode: "xml",
        lineNumbers: true,
        extraKeys: {
          "'<'": completeAfter,
          "'/'": completeIfAfterLt,
          "' '": completeIfInTag,
          "'='": completeIfInTag,
          "Ctrl-Space": "autocomplete"
        },
        hintOptions: {schemaInfo: getSchema()},
        lint: true,
        gutters: ['CodeMirror-lint-markers'],
        lineWrapping: true,
    });
}

const initHeaderEditor = function() {
    const editor = document.getElementById('headereditor');
    document.getElementById('teiheader').style.display = 'none';
    const fields = editor.querySelectorAll('input,select,textarea');
    for(let field of fields) {
        let xmlEl = state.xmlDoc.querySelector(field.dataset.select);
        let attr = field.dataset.attr;
        let prefix = field.dataset.prefix;
        let value;

        if(!xmlEl) continue;

        if(attr)
            value = xmlEl.getAttribute(attr);
        else  
            value = xmlEl.innerHTML;

        //if(!value) continue;
        if(!value) value = '';

        if(field.multiple) {
            value = value.split(' ');                
            if(prefix)
                value = value.map(s => s.replace(newRegExp('^'+prefix),''));
            let opts = field.querySelectorAll('option');
            for(let opt of opts) {
                if(value.includes(opt.value))
                    opt.selected = true;
            }
        }
        
        else {
            if(prefix)
                value = value.replace(new RegExp('^'+prefix),'');
            field.value = value;
        }
    }
    editor.style.display = 'block';
    const choices = new Choices(document.getElementById('hd_otherLangs'));
}

const viafSearch = function(imgEl) {
    const search_term = imgEl.parentElement.querySelector('input').value;
    const window_features = "menubar=no,height=500,width=600,centerscreen=yes,scrollbars=yes";
    window.open('https://viaf.org/viaf/search?query=local.names+all+"'+search_term+'"',"VIAFsearch",window_features);
}

const pancangaSearch = function() {
    const window_features = "menubar=no,height=500,width=600,centerscreen=yes,scrollbars=yes";
    window.open('http://www.cc.kyoto-su.ac.jp/~yanom/pancanga/',"PancangaSearch",window_features);
}

const updateHeader = function() {
    const editor = document.getElementById('headereditor');
    const fields = editor.querySelectorAll('input,select,textarea');
    for(let field of fields) {
        if(!field.validity.valid) {
            alert('Missing information');
            return;
        }
    }
    for(let field of fields) {
        let value = field.type === 'text' ? 
            field.value.trim() : 
            field.value;
        let attr = field.dataset.attr;
        let prefix = field.dataset.prefix;
        let xmlEl = state.xmlDoc.querySelector(field.dataset.select);
        if(!value) {
            if(!xmlEl) continue;
            else {
                if(attr)
                    xmlEl.setAttribute(attr,'');
                else
                    xmlEl.innerHTML = '';
                continue;
            }
        }
        if(!xmlEl) xmlEl = makeElement(state.xmlDoc,field.dataset.select,'fileDesc');
        if(field.multiple) {
            let selected = [];
            for(let opt of field.querySelectorAll('option[selected]'))
                selected.push(opt.value);
            value = selected.join(' ');
        }
        if(prefix) 
            value = prefix + value;
        if(attr)
            xmlEl.setAttribute(attr,value);
        else  
            xmlEl.innerHTML = value;
    }
    
    // update title field in titleStmt
    const titleStmttitle = state.xmlDoc.querySelector('titleStmt > title');
    const title = state.xmlDoc.querySelector(editor.querySelector('#hd_title').dataset.select).innerHTML;
    const author = state.xmlDoc.querySelector(editor.querySelector('#hd_author').dataset.select).innerHTML;
    const idno = state.xmlDoc.querySelector(editor.querySelector('#hd_idno').dataset.select).innerHTML;
    titleStmttitle.innerHTML = `
    <title type="main">${idno}</title>
    <title type="sub">${title} of ${author}</title>
`;
    
    state.xmlTxt = state.xmlDoc.documentElement.outerHTML;
    splitSections(state.xmlTxt);
    renderHeader(state.xmlDoc);
    editor.style.display = 'none';
    document.getElementById('teiheader').style.display = 'block';
}

const makeElement = function(xmlDoc,selector,par) {
    const ns = xmlDoc.querySelector('TEI').namespaceURI;
    var par_el = xmlDoc.querySelector(par);
    const children = selector.split(/[\s>]/g).filter(x => x);
    for(let child of children) {
        let child_el = par_el.querySelector(child);
        if(!child_el) {
            let new_child = xmlDoc.createElementNS(ns,child);
            par_el.appendChild(new_child);
            par_el = new_child;
        }
        else par_el = child_el;
    }
    return par_el;
}

const destroyHeaderEditor = function() {
    document.getElementById('headereditor').style.display = 'none';
    document.getElementById('teiheader').style.display = 'block';
}

const menuMouseover = function(e) {
    const targ = e.target.classList.contains('menubox') ?
        e.target :
        e.target.closest(".menubox");
    if(targ) {
        targ.querySelector('ul').style.display = 'block';
        targ.classList.add('open');
    }
}

const menuMouseout = function(e) {
    const targ = e.target.classList.contains('menubox') ?
        e.target :
        e.target.closest(".menubox");
    if(targ) {
        targ.querySelector('ul').style.display = 'none';
        targ.classList.remove('open');
    }
}

const scriptSelect = function(e) {
    if(e.target.tagName !== 'LI') return;
    const script = e.target.dataset.value;
    const scriptlist = document.querySelectorAll('#scriptselect li');
    for(const li of scriptlist) {
        if(li.dataset.value === script)
            li.classList.add('selected');
        else
            li.classList.remove('selected');
    }
    document.querySelector('#scriptselect .heading').textContent = e.target.textContent;

    const teibody = document.getElementById('teibody');
    const headerdiv = document.getElementById('teiheader');
    const middle = inViewport(headerdiv) ?
        null :
        findMiddleElement();

    state.script = script;

    renderBody(state.xmlDoc);
    
    setViewPos(middle);
}

const inViewport = function(el) {
    const rect = el.getBoundingClientRect();
    return el.top >= 0 && el.bottom <= window.innerHeight;
}

const findMiddleElement = function() {
    const lbs = (state.view === 'folio') ? 
        document.querySelectorAll('.lb') :
        document.querySelectorAll('.lb-minimal');
    const midheight = window.innerHeight/2;
    var lastdist;
    var currdist = null;
    var lastel;
    var midel;
    for(let i=0;i<lbs.length;i++) {
        const lb = lbs[i];
        const rect = lb.getBoundingClientRect();
        const viewportoffset = rect.top;
        if(viewportoffset < 0) continue;
        lastdist = currdist;
        currdist = midheight - viewportoffset;
        if(lastdist != null && Math.abs(currdist) > Math.abs(lastdist)) {
            midel = i-1;
            break;
        }
    }
    if(midel === null)
        midel = lbs.length-1;
    return [midel,lastdist];

}

const getOffsetTop = function(el) {
    return el.getBoundingClientRect().top + window.pageYOffset;
}

const setViewPos = function(middle) {
    if(middle === null)
        return;
    const midel = (state.view === 'folio') ?
        document.querySelectorAll('.lb')[middle[0]] :
        document.querySelectorAll('.lb-minimal')[middle[0]];
    const dist = getOffsetTop(midel) + middle[1] - window.innerHeight/2;
    window.scrollTo(0,dist);
}

const to = {

    smush: function(text,placeholder) {
        text = text.toLowerCase();
        
        // remove space between a word that ends in a consonant and a word that begins with a vowel
        text = text.replace(/([ḍdrmvynhs]) ([aāiīuūṛeoêô])/g, '$1$2'+placeholder);
        
        // remove space between a word that ends in a consonant and a word that begins with a consonant
        text = text.replace(/([kgcjñḍtdnpbmrlyvśṣsṙ]) ([kgcjṭḍtdnpbmyrlvśṣshḻ])/g, '$1'+placeholder+'$2');

        // join final o/e/ā and avagraha/anusvāra
        text = text.replace(/([oôeêā]) ([ṃ'])/g,'$1'+placeholder+'$2');

        text = text.replace(/^ṃ/,"'\u200Dṃ"); // initial anusvāra
        text = text.replace(/^ḥ/,"'\u200Dḥ"); // initial visarga
        text = text.replace(/^_y/,"'\u200Dy"); // half-form of ya
        text = text.replace(/ü/g,"\u200Cu");
        text = text.replace(/ï/g,"\u200Ci");

        text = text.replace(/_{1,2}(?=\s*)/g, function(match) {
            if(match === '__') return '\u200D';
            else if(match === '_') return '\u200C';
        });

        return text;
    },

    iast: function(text,from) {
        var from = from || 'devanagari';
        return Sanscript.t(text,from,'iast',{skip_sgml: true});
    },

    devanagari: function(text,placeholder) {

        var text;
        var placeholder = placeholder || '';
        const options = {skip_sgml: true};

        text = text.replace(/ṙ/g, 'r');

        text = text.replace(/^_ā/,"\u093D\u200D\u093E");

        text = to.smush(text,placeholder);

        text = Sanscript.t(text,'iast','devanagari',options);

        text = text.replace(/¯/g, 'ꣻ');

        return text;
    },
    
    malayalam: function(text,placeholder) {

        var text;
        var placeholder = placeholder || '';
        const options = {skip_sgml: true};
	
        const chillu = {
            'ക':'ൿ',
            'ത':'ൽ',
            'ന':'ൻ',
            'മ':'ൔ',
            'ര':'ർ',
        };

        text = text.replace(/^_ā/,"\u0D3D\u200D\u0D3E");

        text = to.smush(text,placeholder);
        text = text.replace(/e/g,'ẽ'); // hack to make long e's short
        text = text.replace(/o/g,'õ'); // same with o
        text = text.replace(/ṙ/g, 'r'); // no valapalagilaka
        text = text.replace(/ṁ/g,'ṃ'); // no malayalam oṃkāra sign
        text = text.replace(/ḿ/g,'ṃ');
        text = text.replace(/î/g,'i'); // no pṛṣṭhamātras
        text = text.replace(/û/g,'u');
        text = text.replace(/ê/g,'e'); 

        text = Sanscript.t(text,'iast','malayalam',options);
	
        // use dot reph
        text = text.replace(/(^|[^്])ര്(?=\S)/g,'$1ൎ');
        
        // use chillu final consonants	
        text = text.replace(/([കതനമര])്(?![^\s\u200C,—’―])/g, function(match,p1) {
            return chillu[p1];
        });
	
        return text;
    },
    
    telugu: function(text,placeholder) {

        var text;
        var placeholder = placeholder || '';
        const options = {skip_sgml: true};

        text = text.replace(/^_ā/,"\u0C3D\u200D\u0C3E");

        text = to.smush(text,placeholder);        
        text = text.replace(/e/g,'ẽ'); // hack to make long e's short
        text = text.replace(/o/g,'õ'); // same with o
        text = text.replace(/ṙ/g,'r\u200D'); // valapalagilaka
        text = text.replace(/ṁ/g,'ṃ'); // no telugu oṃkāra sign
        text = text.replace(/ḿ/g,'ṃ');
        text = text.replace(/î/g,'i'); // no pṛṣṭhamātras
        text = text.replace(/û/g,'u');
        text = text.replace(/ê/g,'e');

        text = Sanscript.t(text,'iast','telugu',options);

        return text;
    },
}

return {
    init: init,
}

}()); // end vetala class

window.addEventListener('load',vetala.init);
