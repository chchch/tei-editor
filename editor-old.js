var vetala = {

xmlDoc: null,
xmlTxt: null,
filename: null,
pblocations: null,
xml_folio: null,
prevcontents: null,
editor: null,
view: 'folio',
script: 'iast',

init: function() {

    document.getElementById('file').addEventListener('change',vetala.fileSelect,false);
    document.getElementById('newfile').addEventListener('click',vetala.newFile);
    vetala.scriptselect = document.getElementById('scriptselect')
    vetala.scriptselect.value = 'iast';
    vetala.scriptselect.addEventListener('change',vetala.scriptSelect);
},

fileSelect: function(e) {
    const file = e.target.files[0];
    vetala.filename = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
      const xmlDoc = vetala.parseXMLString(e.target.result);
      vetala.xmlDoc = xmlDoc;
      vetala.displayXML(xmlDoc);
      document.body.addEventListener('click',vetala.bodyClick);
    };
    reader.readAsText(file);
},

newFile: function() {
    vetala.filename = 'new.xml';
    const xmlDoc = vetala.parseXMLString(tei_template);
    vetala.xmlDoc = xmlDoc;
    vetala.displayXML(xmlDoc);
    document.body.addEventListener('click',vetala.bodyClick);
    vetala.initHeaderEditor();
},

parseXMLString: function(file) {
    const xmlParser = new DOMParser();
    const newXmlDoc = xmlParser.parseFromString(file,'text/xml');
    if(newXmlDoc.documentElement.nodeName == 'parsererror')
        alert('XML errors!');
    else
        return newXmlDoc;

},

bodyClick: function(e) {
    const classes = e.target.classList;

    if(e.target.id === 'headeredit')
        vetala.initHeaderEditor();

    else if(classes.contains('editbutton'))
        vetala.initEditor(e.target.dataset.n);

    else if(classes.contains('viaf_search'))
        vetala.viafSearch(e.target);
    
    else if(classes.contains('pancanga'))
        vetala.pancangaSearch();

    else if(e.target.id === 'updateheader')
        vetala.updateHeader();

    else if(e.target.id === 'cancelheader')
        vetala.destroyHeaderEditor();

    else if(e.target.id === 'cancelbutton')
        vetala.destroyEditor();

    else if(e.target.id === 'updatebutton')
        vetala.saveEdit();

    else if(e.target.id === 'appendbutton')
        vetala.appendFolio();

    else if(e.target.id === 'saveasbutton')
        vetala.saveAs();
    else if(e.target.id === 'storyview')
        vetala.changeView();
},

changeView: function() {
    switch (vetala.view) {
        case 'folio':
           vetala.view = 'story';
           break;

        default:
            vetala.view = 'folio';
    }
    vetala.renderMenu();
    vetala.renderBody(vetala.xmlDoc);
    if(vetala.script !== 'iast') {
        let teibody = document.getElementById('teibody');
        teibody.parentElement.replaceChild(
            vetala.changeScript(teibody,vetala.script),
            teibody);
    }
},

XSLTransform: function(xslsheet,node) {
    const xslt_processor = new XSLTProcessor();
    xslt_processor.importStylesheet(xslsheet);

    return xslt_processor.transformToFragment(node,document);
 },

displayXML: function(xmlDoc) {

    // Render top row of buttons

    vetala.renderMenu();

    // Render TEI header
    
    vetala.renderHeader(xmlDoc);

    // Render TEI body text
    
    vetala.renderBody(xmlDoc);

    // Split the body text into folios
    
    vetala.xmlTxt = xmlDoc.documentElement.outerHTML;
    vetala.splitSections(vetala.xmlTxt);
},

renderMenu: function() {
    const topbuttons = document.getElementById('topbuttons');
    const storytxt = (vetala.view === 'story') ? 'view as folios' : 'view as running text';

    topbuttons.querySelector('#storyview').innerHTML = storytxt;
    topbuttons.style.display = 'block';

},

splitSections: function(xmlTxt) {
    const regex = RegExp('<pb\\s+n=[\'"](\\w+)[\'"].*\/>','g');
    var pblocations = [];
    var results;
    while( (results = regex.exec(xmlTxt)) !== null) {
        pblocations.push({n: results[1], loc: results.index});
    }
    
    pblocations.push({n: null, loc: xmlTxt.indexOf('</body>')});

    vetala.pblocations = pblocations;
},

renderHeader: function(xmlDoc) {
    const teiheader = document.getElementById('teiheader');
    const headerfragment = vetala.XSLTransform(
            document.getElementById('tei_header_style').contentDocument,
            xmlDoc.getElementsByTagName('teiHeader')[0]
    );
    
    teiheader.innerHTML = '';
    teiheader.appendChild(headerfragment);
    
},

renderBody: function(xmlDoc) {
    const bodydiv = document.getElementById('teibody');
    const body = xmlDoc.getElementsByTagName('body')[0];
    var bodyfragment;

    bodydiv.innerHTML = '';
    if(vetala.view === 'story') {
        let bodyXSLT = document.getElementById('tei_body_style_divs').contentDocument;
        bodyfragment = vetala.XSLTransform(bodyXSLT,body);

        let firsthr = document.createElement('hr');
        firsthr.setAttribute('data-n','_first');
        firsthr.style.marginLeft = '-80px';
        firsthr.style.width = 'calc(100% + 160px)';
        bodydiv.appendChild(firsthr);
        
        bodydiv.style.paddingLeft = '80px';
        bodydiv.style.paddingRight = '80px';
        bodydiv.style.textAlign = 'justify';
        bodyfragment = vetala.prettyPrint(bodyfragment);
    }
    else {
        let bodyXSLT = document.getElementById('tei_body_style').contentDocument;
        bodyfragment = vetala.XSLTransform(bodyXSLT,body);

        bodydiv.style.paddingLeft = '0';
        bodydiv.style.paddingRight = '0';
        bodydiv.style.textAlign = 'left';
    }
    bodydiv.appendChild(bodyfragment);

    if(vetala.view === 'folio') {
        let lasthr = document.createElement('hr');
        lasthr.setAttribute('data-n','_last');
        let appendform = document.createRange().createContextualFragment(
`<form id = "appendform" lang="en" class="buttoncontainer row">
    <button type="button" id="appendbutton">new folio</button>
</form> `);
        bodydiv.appendChild(lasthr);
        bodydiv.appendChild(appendform);
    }
},

saveAs: function() {
    const file = new Blob([vetala.xmlTxt], {type: 'text/xml'});
    const fileURL = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = fileURL;anchor.target = '_blank';
    anchor.download = vetala.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
},

getSchema: function() {
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
},

prettyPrint: function(el) {
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
},

changeScript: function(orignode,script,placeholder = false,cur_lang="sa") {
    const func = vetala.to[script];
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
                    vetala.jiggle(kid,script);
                loop(kid,kidlang);
            }
        }
    } //end function loop

    loop(node,cur_lang);
    return node;
},

jiggle: function(node,script) {
    const kids = node.childNodes;
    if(kids[0].nodeType !== 3 && kids[kids.length-1].nodeType !== 3) return;

    const initial_vowels_allowed = (kids[0].nodeType !== 3) ? true : false;
    var add_at_beginning = [];
    const vowels = ['ā','i','ī','u','ū','e','o','ṃ','ḥ','ai','au'];
    const vowels_regex = /[aāiīuūeoṃḥ_]$/;
    const cons_regex = /[kgṅcjñṭḍṇtdnpbmyrlvṣśsh]$/;

    const telugu_vowels = ['ā','i','ī','e','o','_','ai','au'];
    const telu_cons_headstroke = ['h','k','ś','y','g','gh','c','ch','jh','ṭh','ḍ','ḍh','t','th','d','dh','n','p','ph','bh','m','r','l','v','ṣ','s'];
    var telugu_del_headstroke = false;
    var telugu_kids = [];
    
    for (let kid of kids) {
        let txt = kid.textContent;
        if(kid.nodeType === 3) {
            if(txt.trim() === '') continue;
            else if(txt === 'a')
                kid.textContent = '';
            else if(vowels.indexOf(txt) >= 0) {
                let cap = document.createElement('span');
                cap.setAttribute('class','aalt');
                cap.appendChild(kid.cloneNode(false));
                node.replaceChild(cap,kid);
                kid = cap;
            }            
            else if(!txt.trim().match(vowels_regex)) {
                if(script === 'telugu' &&
                   telu_cons_headstroke.indexOf(txt.trim()) >= 0)
                    // if there's a vowel mark above, remove the headstroke from the consonant
                    telugu_kids.push(kid);
                else
                    kid.textContent = txt.replace(/\s+$/,'') + 'a';
            }
        }

        if(kid.nodeType !== 1) continue;

        if(txt === 'a') { 
            kid.textContent = '';
            continue;
        }
        
        if(txt.trim().match(cons_regex)) {
            let last_txt = vetala.findTextNode(kid,true);
            last_txt.textContent = last_txt.textContent.replace(/\s+$/,'') + 'a';
        }

        if(!initial_vowels_allowed) {

            kid.classList.add('aalt');

            switch (script) {
                case 'devanagari':
                    if(txt === 'i' || txt === 'é') 
                        add_at_beginning.unshift(kid);
                    break;
                case 'malayalam':
                    if(txt === 'e') add_at_beginning.unshift(kid);
                    else if(txt === 'ai') add_at_beginning.unshift(kid);
                    else if(txt === 'o') {
                        let new_e = kid.cloneNode(true);
                        vetala.replaceTextInNode('o','e',new_e);
                        add_at_beginning.unshift(new_e);
                        vetala.replaceTextInNode('o','ā',kid);
                    }
                    break;
                case 'telugu':
                    if(!telugu_del_headstroke &&
                       telugu_vowels.indexOf(txt) >= 0)
                        
                        telugu_del_headstroke = true;
                    break;

                }
        }
    } // end for let kid of kids

    for (let el of add_at_beginning) {
        node.insertBefore(el,node.childNodes[0]);
    }

    for (let el of telugu_kids) {
        el.textContent = el.textContent + 'a\u200D\u0C4D';
    }
},

findTextNode: function(node,last = false) {
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null,false);
    if(!last) return walker.nextNode;
    else {
        let txt;
        while(walker.nextNode())
            txt = walker.currentNode;
        return txt;
    }
},

replaceTextInNode: function(text, replace, node) {
    const walker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null,false);
    while(walker.nextNode()) {
        let cur_txt = walker.currentNode.textContent;
        if(cur_txt.match(text))
            walker.currentNode.textContent = replace;
    }
},

extractHTMLFolio: function(pb_n) {

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
},

getNewFolio: function() {
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
},

extractXMLFolio: function(pb_n) {
    var start_index, end_index, prevcontents;

    if(pb_n === '_last') {
       start_index = vetala.pblocations[vetala.pblocations.length - 1].loc;
       end_index = start_index;
       prevcontents = vetala.getNewFolio();
    }
    else {
        var next_is_end = false;

        for(let pbloc of vetala.pblocations) {
            if(next_is_end) {
                end_index = pbloc.loc;
                break;
            } 
            else if(pbloc.n === pb_n) {
                start_index = pbloc.loc;
                next_is_end = true;
            }
        }
        prevcontents = vetala.xmlTxt.substring(start_index,end_index);
    }

    return {start: start_index, end: end_index, prevcontents: prevcontents};
},

saveEdit: function() {
    vetala.editor.save();
    const savetxt = document.getElementById('edit_in_place').value;
    const newtxt = vetala.xmlTxt.substring(0,vetala.xml_folio.start) + 
                 savetxt +
                 vetala.xmlTxt.substring(vetala.xml_folio.end);
    vetala.xmlTxt  = newtxt;
    const xmlParser = new DOMParser();
    const newXmlDoc = xmlParser.parseFromString(newtxt,'text/xml');
    if(newXmlDoc.documentElement.nodeName == 'parsererror')
        alert('XML errors!');
    else {
        vetala.xmlTxt = newtxt;
        vetala.splitSections(newtxt);
        vetala.xmlDoc = newXmlDoc;
        vetala.renderBody(newXmlDoc);
        if(vetala.script !== 'iast') {
            let teibody = document.getElementById('teibody');
            teibody.parentElement.replaceChild(
                vetala.changeScript(teibody,vetala.script),
                teibody);
        }
    }
},

appendFolio: function() {
    vetala.initEditor('_last');
},

destroyEditor: function() {
    const editor = document.getElementById('editor_form');
    if(!editor) return false;
    editor.parentNode.insertBefore(vetala.prevcontents,editor);
    editor.parentNode.removeChild(editor);
    vetala.prevcontents = null;
    return true;
},

initEditor: function(pb_n) {
    
    vetala.destroyEditor();

    const xml_folio = vetala.extractXMLFolio(pb_n);
    vetala.xml_folio = xml_folio;
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

    const html_folio = vetala.extractHTMLFolio(pb_n);
    vetala.prevcontents = html_folio.prevcontents;
    
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
    vetala.initCodeMirror(textarea);
},

initCodeMirror: function(textarea) {

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

    vetala.editor = CodeMirror.fromTextArea(textarea, {
        mode: "xml",
        lineNumbers: true,
        extraKeys: {
          "'<'": completeAfter,
          "'/'": completeIfAfterLt,
          "' '": completeIfInTag,
          "'='": completeIfInTag,
          "Ctrl-Space": "autocomplete"
        },
        hintOptions: {schemaInfo: vetala.getSchema()},
        lint: true,
        gutters: ['CodeMirror-lint-markers'],
        lineWrapping: true,
    });
},

initHeaderEditor: function() {
    const editor = document.getElementById('headereditor');
    document.getElementById('teiheader').style.display = 'none';
    const fields = editor.querySelectorAll('input,select,textarea');
    for(let field of fields) {
        let xmlEl = vetala.xmlDoc.querySelector(field.dataset.select);
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
},

viafSearch: function(imgEl) {
    const search_term = imgEl.parentElement.querySelector('input').value;
    const window_features = "menubar=no,height=500,width=600,centerscreen=yes,scrollbars=yes";
    window.open('https://viaf.org/viaf/search?query=local.names+all+"'+search_term+'"',"VIAFsearch",window_features);
},
pancangaSearch: function() {
    const window_features = "menubar=no,height=500,width=600,centerscreen=yes,scrollbars=yes";
    window.open('http://www.cc.kyoto-su.ac.jp/~yanom/pancanga/',"PancangaSearch",window_features);
},

updateHeader: function() {
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
        let xmlEl = vetala.xmlDoc.querySelector(field.dataset.select);
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
        if(!xmlEl) xmlEl = vetala.makeElement(vetala.xmlDoc,field.dataset.select,'fileDesc');
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
    const titleStmttitle = vetala.xmlDoc.querySelector('titleStmt > title');
    const title = vetala.xmlDoc.querySelector(editor.querySelector('#hd_title').dataset.select).innerHTML;
    const author = vetala.xmlDoc.querySelector(editor.querySelector('#hd_author').dataset.select).innerHTML;
    const idno = vetala.xmlDoc.querySelector(editor.querySelector('#hd_idno').dataset.select).innerHTML;
    titleStmttitle.innerHTML = `
    <title type="main">${idno}</title>
    <title type="sub">${title} of ${author}</title>
`;
    
    vetala.xmlTxt = vetala.xmlDoc.documentElement.outerHTML;
    vetala.splitSections(vetala.xmlTxt);
    vetala.renderHeader(vetala.xmlDoc);
    editor.style.display = 'none';
    document.getElementById('teiheader').style.display = 'block';
},

makeElement: function(xmlDoc,selector,par) {
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
},

destroyHeaderEditor: function() {
    document.getElementById('headereditor').style.display = 'none';
    document.getElementById('teiheader').style.display = 'block';
},

scriptSelect: function() {
    const script = vetala.scriptselect.value;
    const teibody = document.getElementById('teibody');
    if(vetala.script !== 'iast' || script === 'iast')
        vetala.renderBody(vetala.xmlDoc);

    vetala.script = script;
    
    if(vetala.script !== 'iast')
        teibody.parentElement.replaceChild(
            vetala.changeScript(teibody,vetala.script),
            teibody);
},

to: {

    smush: function(text,placeholder) {
        text = text.toLowerCase();
        
        // remove space between a word that ends in a consonant and a word that begins with a vowel
        text = text.replace(/([ḍdrmvynhs]) ([aāiīuūṛeoéó])/g, '$1$2'+placeholder);
        
        // remove space between a word that ends in a consonant and a word that begins with a consonant
        text = text.replace(/([kgcjñḍtdnpbmrlyvśṣsṙ]) ([kgcjṭḍtdnpbmyrlvśṣshḻ])/g, '$1'+placeholder+'$2');

        // join final o/e/ā and avagraha/anusvāra
        text = text.replace(/([oóeéā]) ([ṃ'])/g,'$1'+placeholder+'$2');

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

        text = vetala.to.smush(text,placeholder);

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

        text = vetala.to.smush(text,placeholder);
        text = text.replace(/e/g,'ẽ'); // hack to make long e's short
        text = text.replace(/o/g,'õ'); // same with o
        text = text.replace(/ṙ/g, 'r'); // no valapalagilaka
        text = text.replace(/ṁ/g,'ṃ'); // no malayalam oṃkāra sign
        text = text.replace(/ḿ/g,'ṃ');
        text = text.replace(/í/g,'i'); // no pṛṣṭhamātras
        text = text.replace(/ú/g,'u');
        text = text.replace(/é/g,'e'); 

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

        text = vetala.to.smush(text,placeholder);        
        text = text.replace(/e/g,'ẽ'); // hack to make long e's short
        text = text.replace(/o/g,'õ'); // same with o
        text = text.replace(/ṙ/g,'r\u200D'); // valapalagilaka
        text = text.replace(/ṁ/g,'ṃ'); // no telugu oṃkāra sign
        text = text.replace(/ḿ/g,'ṃ');
        text = text.replace(/í/g,'i'); // no pṛṣṭhamātras
        text = text.replace(/ú/g,'u');
        text = text.replace(/é/g,'e');

        text = Sanscript.t(text,'iast','telugu',options);

        return text;
    },
},

}; // end vetala class

window.addEventListener('load',vetala.init);
