'use strict';

import { Dimensions } from 'react-native';

const domMutationObserveScript = `
  var MutationObserver =
    window.MutationObserver || window.WebKitMutationObserver;
  var observer = new MutationObserver(updateSize);
  observer.observe(document, {
    subtree: true,
    attributes: true
  });
`;

const updateSizeWithMessage = (element, scalesPageToFit) =>
  `
  var usingScale = 0;
  var scaling = false;
  var zoomedin = false;
  var lastHeight = 0;
  var heightTheSameTimes = 0;
  var maxHeightTheSameTimes = 5;
  var forceRefreshDelay = 1000;
  var forceRefreshTimeout;
  var checkPostMessageTimeout;

  function updateSize() {
    if (zoomedin || scaling) {
      return;
    }
    if (
      !window.hasOwnProperty('ReactNativeWebView') || 
      !window.ReactNativeWebView.hasOwnProperty('postMessage')
    ) {
      checkPostMessageTimeout = setTimeout(updateSize, 200);
      return;
    }

    clearTimeout(checkPostMessageTimeout);
    height = ${element}.offsetHeight || document.documentElement.offsetHeight;
    width = ${element}.offsetWidth || document.documentElement.offsetWidth;

    if(!usingScale && window.innerWidth) {
      usingScale = ${scalesPageToFit ? 'screen.width / window.innerWidth' : '1'};
    }

    // window.ReactNativeWebView.postMessage(JSON.stringify({ width: Math.min(width, screen.width), height: document.body.scrollHeight }));

    // Make additional height checks (required to fix issues wit twitter embeds)
    clearTimeout(forceRefreshTimeout);

    if (lastHeight !== height) {
      heightTheSameTimes = 1;
    } else {
      heightTheSameTimes++;
    }

    lastHeight = height;

    if (heightTheSameTimes <= maxHeightTheSameTimes) {
      forceRefreshTimeout = setTimeout(
        updateSize,
        heightTheSameTimes * forceRefreshDelay
      );
    }
  }
  `;

const setViewportContent = content => {
  if (!content) {
    return '';
  }
  return `
    var meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    meta.setAttribute("content", "${content}");
    document.getElementsByTagName("head")[0].appendChild(meta);
  `;
};

const detectZoomChanged = `
  var latestTapStamp = 0;
  var lastScale = 1.0;
  var doubleTapDelay = 400;
  function detectZoomChanged() {
    var tempZoomedin = (screen.width / window.innerWidth) > (usingScale || 1);
    tempZoomedin !== zoomedin && window.ReactNativeWebView.postMessage(JSON.stringify({ zoomedin: tempZoomedin }));
    zoomedin = tempZoomedin;
  }
  window.addEventListener('ontouchstart', event => {
    if (event.touches.length === 2) {
      scaling = true;
    }
  })
  window.addEventListener('touchend', event => {
    if(scaling) {
      scaleing = false;
    }
  
    var tempScale = event.scale; 
    tempScale !== lastScale && detectZoomChanged();
    lastScale = tempScale;
    var timeSince = new Date().getTime() - latestTapStamp;

    // double tap   
    if(timeSince < 600 && timeSince > 0) {
      zoomedinTimeOut = setTimeout(() => {
        clearTimeout(zoomedinTimeOut);
        detectZoomChanged();
      }, doubleTapDelay);
    }

    latestTapStamp = new Date().getTime();
  });
`;

const getBaseScript = ({ viewportContent, scalesPageToFit, scrollEnabledWithZoomedin }) =>
  `
  ;
  if (!document.getElementById("rnahw-wrapper")) {
    var wrapper = document.createElement('div');
    wrapper.id = 'rnahw-wrapper';
    while (document.body.firstChild instanceof Node) {
      wrapper.appendChild(document.body.firstChild);
    }
    document.body.appendChild(wrapper);
  }
  ${updateSizeWithMessage('wrapper', scalesPageToFit)}
  window.addEventListener('load', updateSize);
  window.addEventListener('resize', updateSize);
  ${domMutationObserveScript}
  ${setViewportContent(viewportContent)}
  ${scrollEnabledWithZoomedin ? detectZoomChanged : ''}
  updateSize();
  `;

const appendFilesToHead = ({ files, script }) =>
  files.reduceRight((combinedScript, file) => {
    const { rel, type, href } = file;
    return `
      var link  = document.createElement('link');
      link.rel  = '${rel}';
      link.type = '${type}';
      link.href = '${href}';
      document.head.appendChild(link);
      ${combinedScript}
    `;
  }, script);

const screenWidth = Dimensions.get('window').width;

const bodyStyle = `
  body {
    margin: 0;
    padding: 0;
  }
`;

const appendStylesToHead = ({ style, script }) => {
  const currentStyles = style ? bodyStyle + style : bodyStyle;
  // Escape any single quotes or newlines in the CSS with .replace()
  const escaped = currentStyles.replace(/\'/g, "\\'").replace(/\n/g, '\\n');
  return `
    var styleElement = document.createElement('style');
    styleElement.innerHTML = '${escaped}';
    document.head.appendChild(styleElement);
    ${script}
  `;
};

const getInjectedSource = ({ html, script }) => `
  <meta name="viewport" content="viewport-fit=cover,user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0" />
  <style>
   img{
      object-fit:contain;
      margin:0;padding:0;
      display:block;
      margin:auto;
     }
     body{
      width:100%;
      height:100%;
      margin:auto;
      word-break: break-all

     }
     html{
      margin:auto;
      height:100%;
      width:100%;
      min-height:100%;
      min-width:100%;
       word-break: break-all
     }
  </style>
  ${html}
  <script>
  // prevents code colissions with global scope
  (function() {
    reportHeight();
    var imgs= document.querySelectorAll("img");
    var imgsUrls=[];
    for(var i=0;i<imgs.length;i++){
        imgsUrls.push(imgs[i].src);
    }
    for(var i=0;i<imgs.length;i++){
        setImgWH(imgs[i],i,imgs)
    }
    function setImgWH(img,index,imgs){
      img.onclick=function(){
        // alert(index);
        try{
          window.ReactNativeWebView.postMessage(JSON.stringify({ action:'clickImg',data:{
            curUrl:this.src,
            urls:imgsUrls,
            curIndex:index
          } }));
        }catch(err){
          alert(err.message);
        }
      }
      img.onload=function(e){
          // alert(this.height);
          try{
            // this.style.height=this.height+"px";
            // alert(this.width);
            var bodywidth=getBodyWidth();
            if(this.width>bodywidth){
              this.style.height=(bodywidth/this.width *this.height)+'px'
              // alert(this.style.height)
            }
            reportHeight(); 
            setTimeout(()=>{
              reportHeight(); 
            },60)         
          }catch(err){
            alert(err.message);
          }
      }
    }
    function getBodyWidth(){
      return Math.min(document.documentElement.offsetWidth, screen.width)
    }
    function reportHeight(){
       var bodyHeight=document.body.scrollHeight==0?document.documentElement.scrollHeight:document.body.scrollHeight;

         var bheight = bodyHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({ width: Math.min(document.documentElement.offsetWidth, screen.width), height: bheight }));


    }

    window.onload=function(){
      ${script}
      reportHeight();
    }
  })();
  </script>
`;

const getScript = ({
  files,
  customStyle,
  customScript,
  style,
  viewportContent,
  scalesPageToFit,
  scrollEnabledWithZoomedin
}) => {
  let script = getBaseScript({ viewportContent, scalesPageToFit, scrollEnabledWithZoomedin });
  script = files && files.length > 0 ? appendFilesToHead({ files, script }) : script;
  script = appendStylesToHead({ style: customStyle, script });
  customScript && (script = customScript + script);
  return script;
};

export const getWidth = style => {
  return style && style.width ? style.width : screenWidth;
};

export const isSizeChanged = ({ height, previousHeight, width, previousWidth }) => {
  if (!height || !width) {
    return;
  }
  return height !== previousHeight || width !== previousWidth;
};

export const reduceData = props => {
  const { source } = props;
  const script = getScript(props);
  const { html, baseUrl } = source;
  if (html) {
    return {
      currentSource: { baseUrl, html: getInjectedSource({ html, script }) }
    };
  } else {
    return {
      currentSource: source,
      script
    };
  }
};

export const shouldUpdate = ({ prevProps, nextProps }) => {
  if (!(prevProps && nextProps)) {
    return true;
  }
  for (const prop in nextProps) {
    if (nextProps[prop] !== prevProps[prop]) {
      if (typeof nextProps[prop] === 'object' && typeof prevProps[prop] === 'object') {
        if (
          shouldUpdate({
            prevProps: prevProps[prop],
            nextProps: nextProps[prop]
          })
        ) {
          return true;
        }
      } else {
        return true;
      }
    }
  }
  return false;
};
