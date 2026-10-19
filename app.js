/* Sure Step Marine Fleet Manager — self-contained interactive demo.
   No GPS hardware, production database, billing, or messaging is connected. */
(() => {
  'use strict';
  const KEY = 'surestep-fleet-prototype-v1';
  // v0.4: imagery source diagnostics to distinguish blocked tiles from map bugs.
  const MAP_SOURCES = {
    esri: {name:'Satellite · Esri', url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution:'Tiles &copy; Esri, Maxar, Earthstar Geographics, GIS User Community', maxNativeZoom:19},
    usgs: {name:'Aerial · USGS', url:'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', attribution:'Imagery &copy; USGS, USDA - The National Map', maxNativeZoom:16},
    streets: {name:'Street map · OSM', url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution:'&copy; OpenStreetMap contributors', maxNativeZoom:19}
  };
  const MAP_FALLBACK_ORDER = ['esri','usgs','streets'];
  let selectedMapSource = 'esri', activeMapLayer = null, mapTileTimer = null;

  const ICONS = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    map:'<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>',
    ship:'<path d="M3 18l9 3 9-3-3-4H6l-3 4Z"/><path d="M12 3v11M12 4l6 5h-6"/><path d="M3 22c2-1 4-1 6 0s4 1 6 0 4-1 6 0"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    wrench:'<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 17.6a2.1 2.1 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4l-3.1 3.1-3.5-.7-.7-3.5Z"/>',
    gauge:'<path d="M5 17a9 9 0 1 1 14 0"/><path d="m12 13 4-5"/><circle cx="12" cy="13" r="1"/><path d="M7 19h10"/>',
    chart:'<path d="M3 3v18h18"/><path d="m7 15 4-5 4 3 5-8"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.06-2.12 2.12-.06-.05a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21H9.3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.87.34l-.06.05-2.12-2.12.05-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3V10h.04A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.87L4.2 7.04l2.12-2.12.06.05a1.7 1.7 0 0 0 1.87.34A1.7 1.7 0 0 0 9.28 3.75V3h5.42v.75a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.05 2.12 2.12-.05.06a1.7 1.7 0 0 0-.34 1.87A1.7 1.7 0 0 0 20.96 10H21v3.97h-.04A1.7 1.7 0 0 0 19.4 15Z"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    arrow:'<path d="M4 12h16m-7-7 7 7-7 7"/>',
    back:'<path d="M20 12H4m7-7-7 7 7 7"/>',
    check:'<path d="m4 12 5 5L20 6"/>',
    warning:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4m0 4h.01"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    battery:'<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 10v4M6 12h6"/>',
    locate:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/>',
    search:'<circle cx="10.7" cy="10.7" r="7"/><path d="m16 16 5 5"/>',
    file:'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M13 2v7h7M8 13h8m-8 4h8"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Zm14-15a3 3 0 0 1 0 6m1 5a5 5 0 0 1 3 4"/>',
    shield:'<path d="m12 2 9 4v6c0 5-3.4 8-9 10-5.6-2-9-5-9-10V6Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/>',
    dollar:'<circle cx="12" cy="12" r="9"/><path d="M15 8h-5a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H9m3-11v14"/>',
    upload:'<path d="M12 17V3m-5 5 5-5 5 5M3 17v4h18v-4"/>',
    alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
    filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',
    close:'<path d="M5 5l14 14M19 5 5 19"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    activity:'<path d="M2 12h5l3-7 4 14 3-7h5"/>'
  };
  const icon = (name, size=18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.grid}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
  const fmtHours = n => Number(n||0).toFixed(1);
  const nowDate = () => new Date().toISOString().slice(0,10);
  const demoBoats = [
    ['PT-01','Pontoon 01','Pontoon','Yamaha F115',428.6,'rented',12.7,18,370,155,true,3850],
    ['PT-02','Pontoon 02','Pontoon','Mercury 115',496.2,'rented',12.5,16,445,217,true,4250],
    ['PT-03','Pontoon 03','Pontoon','Suzuki DF90',608.3,'service',12.4,0,258,300,true,0],
    ['PT-04','Pontoon 04','Pontoon','Yamaha F115',256.7,'docked',12.8,0,249,294,true,0],
    ['PT-05','Pontoon 05','Pontoon','Mercury 150',390.2,'rented',12.6,21,492,293,true,4600],
    ['PT-06','Pontoon 06','Pontoon','Suzuki DF115',264.4,'docked',12.6,0,266,285,false,0],
    ['PT-07','Pontoon 07','Pontoon','Yamaha F150',320.8,'alert',12.4,18,630,112,true,4370],
    ['PT-08','Pontoon 08','Pontoon','Mercury 115',188.9,'docked',12.7,0,276,312,false,0],
    ['SK-01','Skiff 01','Skiff','Yamaha F70',148.8,'rented',12.6,14,491,339,true,3600],
    ['SK-02','Skiff 02','Skiff','Suzuki DF60',225.1,'docked',12.1,0,272,318,false,0],
    ['SK-03','Skiff 03','Skiff','Mercury 90',389.2,'service',11.9,0,249,321,true,0],
    ['SK-04','Skiff 04','Skiff','Yamaha F70',177.4,'docked',12.5,0,257,337,false,0]
  ];
  const defaultState = () => ({
    boats:demoBoats.map((a,i)=>({id:a[0],name:a[1],type:a[2],engine:a[3],hours:a[4],status:a[5],voltage:a[6],speed:a[7],x:a[8],y:a[9],engineConnected:a[10],rpm:a[11],maxRpm:a[10]?([4680,5170,0,0,5680,0,5850,0,4300,0,0,0][i]):0,device:`SSM-${String(1101+i)}`,year:2023+(i%3),notes:'',lastUpdate:'18 sec ago'})),
    rentals:[
      {id:'R-1001',boatId:'PT-01',guest:'Demo Guest A',start:'9:00 AM',return:'1:00 PM',status:'active'},
      {id:'R-1002',boatId:'PT-02',guest:'Demo Guest B',start:'9:30 AM',return:'2:30 PM',status:'active'},
      {id:'R-1003',boatId:'PT-05',guest:'Demo Guest C',start:'10:00 AM',return:'4:00 PM',status:'active'},
      {id:'R-1004',boatId:'PT-07',guest:'Demo Guest D',start:'9:45 AM',return:'1:45 PM',status:'active'},
      {id:'R-1005',boatId:'SK-01',guest:'Demo Guest E',start:'11:00 AM',return:'3:00 PM',status:'active'},
      {id:'R-0998',boatId:'PT-08',guest:'Demo Guest F',start:'Yesterday',return:'Yesterday',status:'complete'}
    ],
    maintenance:[
      {id:'M-01',boatId:'PT-02',title:'100-hour engine service',dueHours:500,interval:100,dueDate:'',status:'open'},
      {id:'M-02',boatId:'PT-03',title:'Water pump inspection',dueHours:600,interval:200,dueDate:'',status:'open'},
      {id:'M-03',boatId:'SK-03',title:'Engine oil and filter',dueHours:400,interval:100,dueDate:'',status:'open'},
      {id:'M-04',boatId:'PT-07',title:'Engine oil and filter',dueHours:350,interval:100,dueDate:'',status:'open'},
      {id:'M-05',boatId:'PT-01',title:'Safety equipment inspection',dueHours:null,interval:0,dueDate:'2026-11-15',status:'open'},
      {id:'M-06',boatId:'PT-06',title:'Steering inspection',dueHours:null,interval:0,dueDate:'2026-11-01',status:'open'}
    ],
    records:[
      {id:'S-001',boatId:'PT-02',title:'Engine oil & filter',date:'2026-09-26',hours:400,cost:145,technician:'Marina Service',notes:'Routine service completed'},
      {id:'S-002',boatId:'PT-03',title:'Water pump replacement',date:'2026-08-19',hours:400,cost:285,technician:'Marina Service',notes:'New impeller and gasket'},
      {id:'S-003',boatId:'PT-07',title:'100-hour engine service',date:'2026-09-07',hours:250,cost:195,technician:'Marina Service',notes:'Oil, filter and lower unit'},
      {id:'S-004',boatId:'SK-01',title:'Safety inspection',date:'2026-10-03',hours:140,cost:0,technician:'Dock Staff',notes:'Safety kit and fire extinguisher checked'},
      {id:'S-005',boatId:'PT-01',title:'Engine oil & filter',date:'2026-08-26',hours:400,cost:155,technician:'Marina Service',notes:'Standard interval'},
      {id:'S-006',boatId:'SK-03',title:'Engine oil & filter',date:'2026-09-12',hours:300,cost:115,technician:'Marina Service',notes:''}
    ],
    alerts:[
      {id:'A-01',boatId:'PT-07',type:'Geofence breach',detail:'Pontoon 07 is outside the permitted rental area.',time:'11:42 AM',level:'red',status:'open'},
      {id:'A-02',boatId:'SK-03',type:'Low battery voltage',detail:'Skiff 03 reported 11.9V at the last check-in.',time:'10:08 AM',level:'amber',status:'open'},
      {id:'A-03',boatId:'PT-02',type:'Maintenance approaching',detail:'Pontoon 02 is 3.8 engine hours from service.',time:'9:16 AM',level:'amber',status:'acknowledged'}
    ],
    rpmEvents:[{id:'E-01',boatId:'PT-07',rpm:5850,limit:5600,duration:'12 sec',time:'11:08 AM',date:'2026-10-14'}, {id:'E-02',boatId:'PT-05',rpm:5680,limit:5500,duration:'7 sec',time:'10:47 AM',date:'2026-10-14'}],
    settings:{geofence:true,motion:true,battery:true,overrpm:true,email:true,sms:false,autoMaintenance:true,geofenceBuffer:60,batteryThreshold:12.0},
    geofences:[{id:'GF-DEMO',name:'Sample polygon — DEMO ONLY',coordinates:[[33.594,-79.061],[33.598,-79.008],[33.564,-78.966],[33.524,-78.985],[33.526,-79.066]],boatIds:['PT-01','PT-02','PT-05','PT-07','SK-01']}]
  });
  let state;
  try { state=JSON.parse(localStorage.getItem(KEY)) || defaultState(); }
  catch { state=defaultState(); }
  if (!state.boats || !state.maintenance || !state.records) state=defaultState();
  if (!Array.isArray(state.geofences)) state.geofences=defaultState().geofences;
  const ui={page:'overview',boatId:'PT-07',boatTab:'overview',filter:'all',search:'',engineBoat:'PT-07',modal:null,
    activeZone:state.geofences[0]?.id||'',zoneMode:'view',zoneDraft:[],zoneClosed:false,zonePanelOpen:false};
  let leafletMap=null, boatProfileMap=null, mapForeground=null, mapView=null, vertexMarkers=[], draftGeometry=null;
  const getZone=()=>state.geofences.find(z=>z.id===ui.activeZone);
  const coordForBoat=b=>Number.isFinite(b.latitude)&&Number.isFinite(b.longitude)?[b.latitude,b.longitude]:[33.56+(210-b.y)*0.00022,-79.037+(b.x-260)*0.00018];
  const zoneForBoat=b=>state.geofences.find(z=>(z.boatIds||[]).includes(b.id));
  const isOutsideGeofence=b=>{const z=zoneForBoat(b);return !!(z&&z.coordinates?.length>=3&&!pointInPolygon(coordForBoat(b),z.coordinates));};
  function rankedWatchlist(){return state.boats.map((b,index)=>{const z=zoneForBoat(b);const position=z?(isOutsideGeofence(b)?'Outside':'Inside'):'Not assigned';return {b,z,position,index};}).sort((a,b)=>Number(b.position==='Outside')-Number(a.position==='Outside')||a.index-b.index);}
  function pointInPolygon(point,polygon){
    let inside=false;const [y,x]=point;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [yi,xi]=polygon[i], [yj,xj]=polygon[j];
      if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
  }
  function disposeMap(){
    if(mapTileTimer){clearTimeout(mapTileTimer);mapTileTimer=null;}
    if(leafletMap){const c=leafletMap.getCenter();mapView={center:[c.lat,c.lng],zoom:leafletMap.getZoom()};leafletMap.remove();leafletMap=null;}
    if(boatProfileMap){boatProfileMap.remove();boatProfileMap=null;}
    activeMapLayer=null;mapForeground=null;vertexMarkers=[];draftGeometry=null;
  }

  function mapStatus(message,kind='loading'){
    const box=document.getElementById('mapImageryStatus');
    if(!box)return;
    box.hidden=!message;
    box.className='map-imagery-status '+(kind==='error'?'is-error':'is-loading');
    box.textContent=message||'';
  }

  // Zoom the map with wheel whenever the pointer is over the map surface.
  function bindMapWheelZoom(element){
    let previousZoomAt=0;
    element.addEventListener('wheel',event=>{
      if(!leafletMap)return;
      event.preventDefault();
      event.stopPropagation();
      const now=Date.now();
      if(now-previousZoomAt<95)return;
      previousZoomAt=now;
      const next=Math.max(3,Math.min(19,leafletMap.getZoom()+(event.deltaY<0?1:-1)));
      leafletMap.setZoomAround(leafletMap.mouseEventToContainerPoint(event),next,{animate:false});
    },{passive:false});
  }

  function activateMapSource(id){
    if(!leafletMap || !window.L || !MAP_SOURCES[id])return;
    if(mapTileTimer){clearTimeout(mapTileTimer);mapTileTimer=null;}
    if(activeMapLayer){leafletMap.removeLayer(activeMapLayer);activeMapLayer=null;}
    selectedMapSource=id;
    const selector=document.getElementById('mapSourceSelect');
    if(selector)selector.value=id;
    const source=MAP_SOURCES[id];
    let loaded=0, errors=0, alreadyFellBack=false;
    mapStatus('Loading '+source.name+'…');
    const layer=L.tileLayer(source.url,{
      attribution:source.attribution,maxZoom:19,maxNativeZoom:source.maxNativeZoom,
      crossOrigin:false,keepBuffer:2
    });
    activeMapLayer=layer;
    function fallback(){
      if(alreadyFellBack||activeMapLayer!==layer||loaded)return;
      alreadyFellBack=true;
      const next=MAP_FALLBACK_ORDER[MAP_FALLBACK_ORDER.indexOf(id)+1];
      if(next){activateMapSource(next);}
      else mapStatus('Imagery is unavailable in this browser. Click “Test map connection” beneath the map to identify what is blocked. The geofence editor remains in demo mode.','error');
    }
    layer.on('tileload',()=>{
      loaded++;
      if(activeMapLayer===layer){
        if(mapTileTimer){clearTimeout(mapTileTimer);mapTileTimer=null;}
        mapStatus('');
      }
    });
    layer.on('tileerror',()=>{errors++;if(errors>=8)fallback();});
    layer.addTo(leafletMap);
    mapTileTimer=setTimeout(()=>{mapTileTimer=null;fallback();},6000);
  }
  // Dedicated image-load check tests the exact browser environment, independently of Leaflet.
  // No keys or personal data are sent. Tile coordinates are a sample around Murrells Inlet, SC.
  const TILE_CHECKS = [
    {name:'Esri satellite',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1642/1148'},
    {name:'USGS aerial',url:'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/12/1642/1148'},
    {name:'OpenStreetMap',url:'https://tile.openstreetmap.org/12/1148/1642.png'}
  ];
  function testTileImage(url,timeoutMs=7000){
    return new Promise(resolve=>{
      const img=new Image();let finished=false;
      const done=(result)=>{if(finished)return;finished=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(result)};
      const timer=setTimeout(()=>done('Timed out'),timeoutMs);
      img.onload=()=>done(img.naturalWidth>0?'Loaded':'Empty image');
      img.onerror=()=>done('Blocked or failed');
      img.src=url;
    });
  }
  async function testMapConnection(){
    const el=document.getElementById('mapTestResults');if(!el)return;
    el.hidden=false;
    const scheme=window.location.protocol;
    el.innerHTML='<strong>Testing satellite providers…</strong><p>Testing three sample image tiles from your current browser. This can take a few seconds.</p>';
    const values=await Promise.all(TILE_CHECKS.map(async t=>({...t,status:await testTileImage(t.url)})));
    const successes=values.filter(r=>r.status==='Loaded').length;
    const sources=values.map(r=>`<div class="map-test-row"><span>${esc(r.name)}</span><strong class="${r.status==='Loaded'?'map-test-ok':'map-test-fail'}">${esc(r.status)}</strong><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open image ↗</a></div>`).join('');
    let instruction='';
    if(successes===0)instruction='All providers failed in this page. Open one of the sample images in a new tab. If they work there but fail here, the website preview or embedded browser may block third-party imagery. Try the downloaded website in Chrome/Edge, or publish it to your own Netlify site.';
    else if(successes<values.length)instruction='Some services are accessible. Choose a provider marked Loaded in the map imagery menu. If the map is still blank, tell us which service loaded and how you opened the website.';
    else instruction='All three map servers are reachable from this page. If the map is still blank, the problem is with map rendering rather than network tile access.';
    if(scheme==='file:')instruction+=' You are currently opening a local file; if problems continue, try serving the website from Netlify over HTTPS.';
    if(window.location.host.includes('chatgpt')||window.location.host.includes('sandbox'))instruction+=' This appears to be a preview environment; preview restrictions may block external imagery.';
    el.innerHTML=`<strong>Map connection test</strong><p>Page: <code>${esc(window.location.protocol+'//'+(window.location.host||'(local file)'))}</code> · Leaflet: ${window.L?'loaded':'unavailable'}</p>${sources}<p class="map-test-guidance">${esc(instruction)}</p>`;
  }

  function redrawZoneLayers(){
    if(!leafletMap||!mapForeground)return;
    mapForeground.clearLayers();vertexMarkers=[];draftGeometry=null;
    state.geofences.forEach(z=>{
      if(ui.zoneMode==='edit'&&ui.activeZone===z.id)return;
      const active=ui.page==='map'&&ui.activeZone===z.id;
      L.polygon(z.coordinates,{color:active?'#f4c45e':'#4ddeb4',weight:active?3:2,opacity:active?1:.68,
        fillColor:active?'#f4c45e':'#26af8e',fillOpacity:active?.13:.075,dashArray:active?null:'7 6',interactive:false}).addTo(mapForeground);
    });
    if(ui.zoneMode==='view')return;
    const pts=ui.zoneDraft.map(p=>L.latLng(p[0],p[1]));
    if(pts.length){
      // New boundaries remain an open line until the first corner is clicked again.
      const closed=ui.zoneMode==='edit'||(ui.zoneMode==='draw'&&ui.zoneClosed);
      draftGeometry=(closed&&pts.length>=3
        ?L.polygon(pts,{color:'#ffd069',weight:3,fillOpacity:.16,dashArray:null,interactive:false})
        :L.polyline(pts,{color:'#ffd069',weight:3,dashArray:'6 5',interactive:false})).addTo(mapForeground);
    }
    if(ui.zoneMode==='draw'){
      // Show a large, clickable start marker. All later corners are non-interactive.
      // The first marker is replaced during redraw, so no duplicate closure points are stored.
      pts.forEach((point,i)=>{
        if(i===0){
          const ready=pts.length>=3&&!ui.zoneClosed;
          const marker=L.marker(point,{keyboard:true,bubblingMouseEvents:false,
            title:ui.zoneClosed?'Boundary closed':ready?'Click to close boundary':'Starting corner',
            icon:L.divIcon({className:'zone-vertex zone-vertex-start'+(ready?' can-close':'')+(ui.zoneClosed?' is-closed':''),
              html:`<span>${ui.zoneClosed?'✓':ready?'↩':'1'}</span>`,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(mapForeground);
          marker.on('click',event=>{
            if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
            if(ui.zoneClosed)return;
            if(ui.zoneDraft.length<3){toast('Place at least three corners before closing the boundary.');return;}
            closeDraftPolygon();
          });
          vertexMarkers.push(marker);
        }else{
          L.circleMarker(point,{radius:6,weight:2,color:'#fff',fillColor:'#f3ad35',fillOpacity:1,interactive:false}).addTo(mapForeground);
        }
      });
    }else if(ui.zoneMode==='edit'){
      pts.forEach((point,i)=>{
        const marker=L.marker(point,{draggable:true,icon:L.divIcon({className:'zone-vertex',html:'<span></span>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(mapForeground);
        marker.on('drag',()=>{const pt=marker.getLatLng();ui.zoneDraft[i]=[pt.lat,pt.lng];draftGeometry?.setLatLngs(ui.zoneDraft);});
        marker.on('dragend',()=>{redrawZoneLayers();syncZoneButtons();});
        marker.on('contextmenu',()=>{if(ui.zoneDraft.length>3){ui.zoneDraft.splice(i,1);redrawZoneLayers();syncZoneButtons();}else toast('A polygon requires at least three corners.');});
        vertexMarkers.push(marker);
      });
    }
  }
  function closeDraftPolygon(){
    if(ui.zoneMode!=='draw'||ui.zoneClosed||ui.zoneDraft.length<3)return;
    if(!coordsValid(ui.zoneDraft)){
      toast('Boundary cannot close: check for crossing lines or overlapping points.');return;
    }
    ui.zoneClosed=true;
    redrawZoneLayers();syncZoneButtons();
    toast('Boundary closed. Name it, assign boats, then Save Polygon.');
  }
  function nearestSegment(latlng,pts){
    const q=leafletMap.latLngToLayerPoint(latlng);let best=Infinity,bestIndex=pts.length;
    for(let i=0;i<pts.length;i++){
      const a=leafletMap.latLngToLayerPoint(pts[i]);const b=leafletMap.latLngToLayerPoint(pts[(i+1)%pts.length]);
      const dx=b.x-a.x,dy=b.y-a.y,t=Math.min(1,Math.max(0,((q.x-a.x)*dx+(q.y-a.y)*dy)/Math.max(.00001,dx*dx+dy*dy)));
      const d=(q.x-a.x-t*dx)**2+(q.y-a.y-t*dy)**2;
      if(d<best){best=d;bestIndex=i+1;}
    }
    return bestIndex;
  }
  function initSatelliteMap(){
    const el=document.getElementById('fleetSatelliteMap');if(!el)return;
    if(!window.L){el.innerHTML='<div class="map-load-error"><strong>Satellite map needs an internet connection.</strong><span>The map library could not load. Reconnect and reload the page; other demo features still work.</span></div>';return;}
    el.innerHTML='';
    leafletMap=L.map(el,{zoomControl:true,scrollWheelZoom:false,preferCanvas:true}).setView(mapView?.center||[33.564,-79.016],mapView?.zoom||11);
    bindMapWheelZoom(el);
    activateMapSource(selectedMapSource);
    const markerLayer=L.layerGroup().addTo(leafletMap);
    mapForeground=L.layerGroup().addTo(leafletMap);
    state.boats.forEach(b=>{
      const c=coordForBoat(b),outside=isOutsideGeofence(b),alert=b.status==='alert'||outside;
      const html=`<span class="vessel-map-pin ${alert?'is-alert':(b.status==='docked'||b.status==='service')?'is-docked':'is-active'}">${esc(b.id.replace('PT-','P').replace('SK-','S'))}</span>`;
      const marker=L.marker(c,{icon:L.divIcon({className:'vessel-icon',html,iconSize:[44,30],iconAnchor:[22,15]})}).addTo(markerLayer);
      marker.bindTooltip(`${esc(b.name)} · ${outside?'OUTSIDE GEOFENCE':esc(b.status)} · DEMO`,{direction:'top',offset:[0,-12]});
      marker.on('click',()=>{if(ui.zoneMode!=='view')return;ui.boatId=b.id;ui.boatTab='overview';ui.page='boat';render();window.scrollTo(0,0);});
    });
    leafletMap.on('click',e=>{
      if(ui.zoneMode==='draw'){
        if(ui.zoneClosed)return;
        // Also accept a click near the first point: easier than pinpointing a small marker.
        if(ui.zoneDraft.length){
          const start=leafletMap.latLngToContainerPoint(ui.zoneDraft[0]);
          const hit=leafletMap.latLngToContainerPoint(e.latlng);
          if(Math.hypot(start.x-hit.x,start.y-hit.y)<=18){
            if(ui.zoneDraft.length>=3)closeDraftPolygon();
            else toast('Place at least three corners before closing the boundary.');
            return;
          }
        }
        ui.zoneDraft.push([Number(e.latlng.lat.toFixed(7)),Number(e.latlng.lng.toFixed(7))]);
        redrawZoneLayers();syncZoneButtons();
      }
      else if(ui.zoneMode==='edit'&&ui.zoneDraft.length>=3){ui.zoneDraft.splice(nearestSegment(e.latlng,ui.zoneDraft),0,[e.latlng.lat,e.latlng.lng]);redrawZoneLayers();syncZoneButtons();}
    });
    leafletMap.on('moveend',()=>{const c=leafletMap.getCenter();mapView={center:[c.lat,c.lng],zoom:leafletMap.getZoom()};});
    redrawZoneLayers();setTimeout(()=>leafletMap?.invalidateSize(),60);
  }
  function initBoatProfileMap(){
    const element=document.getElementById('boatProfileSatelliteMap');
    if(!element)return;
    const boat=getBoat(ui.boatId)||state.boats[0];
    if(!boat||!window.L){element.textContent='Satellite imagery requires an internet connection.';return;}
    const position=coordForBoat(boat);
    boatProfileMap=L.map(element,{zoomControl:true,scrollWheelZoom:true,preferCanvas:true})
      .setView(position,14);
    const src=MAP_SOURCES[selectedMapSource]||MAP_SOURCES.esri;
    L.tileLayer(src.url,{attribution:src.attribution,maxZoom:19,maxNativeZoom:src.maxNativeZoom}).addTo(boatProfileMap);
    L.marker(position,{icon:L.divIcon({className:'vessel-icon',html:'<span class="vessel-map-pin '+(isOutsideGeofence(boat)?'is-alert':'is-active')+'">'+esc(boat.id)+'</span>',iconSize:[62,30],iconAnchor:[31,15]})}).addTo(boatProfileMap)
      .bindTooltip(esc(boat.name)+' · demo position');
    const zone=zoneForBoat(boat);
    if(zone?.coordinates?.length>=3)L.polygon(zone.coordinates,{color:'#f1bb47',weight:2,fillOpacity:.09,interactive:false}).addTo(boatProfileMap);
    setTimeout(()=>boatProfileMap?.invalidateSize(),80);
  }
  function syncZoneButtons(){
    const mode=ui.zoneMode;const help=document.getElementById('zoneHelp');
    if(help)help.textContent=mode==='draw'
      ?ui.zoneClosed?'Boundary closed. Enter a name, choose boats, then click Save Polygon.'
        :`Click map to place corners (${ui.zoneDraft.length} placed). After at least 3 corners, click the FIRST highlighted point again to close the geofence.`
      :mode==='edit'?`Drag gold corner handles, click edge area to add a point, or right-click a handle to remove it (${ui.zoneDraft.length} points). Save when done.`
        :'Select an existing boundary, or start a new one. Satellite imagery is not a navigation chart.';
    document.querySelectorAll('[data-zone-editing]').forEach(el=>{el.hidden=mode==='view';});
    const save=document.getElementById('savePolygonBtn');if(save)save.disabled=ui.zoneDraft.length<3||(mode==='draw'&&!ui.zoneClosed);
    const badge=document.getElementById('zoneModeBadge');if(badge)badge.textContent=mode==='view'?'VIEW MODE':mode==='edit'?'EDIT CORNERS':ui.zoneClosed?'BOUNDARY CLOSED':'DRAW POINT TO POINT';
    document.getElementById('fleetSatelliteMap')?.classList.toggle('drawing-map',mode!=='view');
  }
  function coordsValid(pts){
    if(!Array.isArray(pts)||pts.length<3||pts.length>250)return false;
    if(!pts.every(p=>p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180))return false;
    // Detect self-crossing edges; straight segment test in local lat/lon coordinates.
    const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const crosses=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      if(Math.abs(i-j)<=1||(i===0&&j===pts.length-1))continue;
      if(crosses(pts[i],pts[(i+1)%pts.length],pts[j],pts[(j+1)%pts.length]))return false;
    }
    return Math.abs(pts.reduce((area,p,i)=>area+p[1]*pts[(i+1)%pts.length][0]-pts[(i+1)%pts.length][1]*p[0],0))>1e-10;
  }
  function assignBoatsToZone(zone,boatIds){
    // In this prototype, each vessel has one active operating boundary.
    state.geofences.forEach(other=>{if(other.id!==zone.id)other.boatIds=(other.boatIds||[]).filter(id=>!boatIds.includes(id));});
    zone.boatIds=boatIds;
  }
  function zoneAction(action){
    const zone=getZone();
    if(action==='new'){
      ui.zonePanelOpen=true;ui.activeZone='';ui.zoneMode='draw';ui.zoneDraft=[];ui.zoneClosed=false;render();toast('Click each corner, then click the first point again to close the boundary.');return;
    }
    if(action==='edit'){
      ui.zonePanelOpen=true;
      if(!zone){toast('Select a saved polygon first.');return;}
      ui.zoneMode='edit';ui.zoneDraft=zone.coordinates.map(p=>p.slice());ui.zoneClosed=false;redrawZoneLayers();syncZoneButtons();return;
    }
    if(action==='cancel'){ui.zoneMode='view';ui.zoneDraft=[];ui.zoneClosed=false;ui.zonePanelOpen=false;render();return;}
    if(action==='save'){
      if(ui.zoneMode==='draw'&&!ui.zoneClosed){toast('Click the first corner again to close the boundary before saving.');return;}
      if(!coordsValid(ui.zoneDraft)){toast('Add at least 3 corners and avoid crossing polygon edges.');return;}
      const name=document.getElementById('zoneName')?.value.trim()||`Boundary ${state.geofences.length+1}`;
      const boatIds=[...document.querySelectorAll('.zone-boat:checked')].map(el=>el.value);
      if(zone){zone.name=name;zone.coordinates=ui.zoneDraft.map(p=>p.slice());assignBoatsToZone(zone,boatIds);}
      else {const id='GF-'+Date.now();const fresh={id,name,coordinates:ui.zoneDraft.map(p=>p.slice()),boatIds:[]};state.geofences.push(fresh);assignBoatsToZone(fresh,boatIds);ui.activeZone=id;}
      ui.zoneMode='view';ui.zoneDraft=[];ui.zoneClosed=false;ui.zonePanelOpen=false;save();render();toast('Polygon saved to this browser (demo only).');return;
    }
    if(action==='assign'){
      if(!zone){toast('Select a polygon first.');return;}
      assignBoatsToZone(zone,[...document.querySelectorAll('.zone-boat:checked')].map(el=>el.value));
      zone.name=document.getElementById('zoneName')?.value.trim()||zone.name;
      save();render();toast('Boat assignments and boundary name saved locally.');return;
    }
    if(action==='remove'){
      if(!zone||!confirm(`Delete boundary “${zone.name}”?`))return;
      state.geofences=state.geofences.filter(z=>z.id!==zone.id);ui.activeZone=state.geofences[0]?.id||'';ui.zoneMode='view';ui.zoneDraft=[];ui.zoneClosed=false;save();render();toast('Demo boundary deleted.');return;
    }
    if(action==='fit'){
      const pts=ui.zoneMode!=='view'?ui.zoneDraft:zone?.coordinates;
      if(!pts?.length||!leafletMap){toast('No boundary to display.');return;}
      leafletMap.fitBounds(L.latLngBounds(pts),{padding:[28,28],maxZoom:15});return;
    }
    if(action==='export'){
      if(!state.geofences.length){toast('No boundaries to export.');return;}
      const output = {type:'FeatureCollection',features:state.geofences.map(z=>({
        type:'Feature',
        properties:{id:z.id,name:z.name,boatIds:z.boatIds||[],demo:true},
        geometry:{type:'Polygon',coordinates:[[...z.coordinates.map(p=>[p[1],p[0]]),[z.coordinates[0][1],z.coordinates[0][0]]]]}
      }))};
      const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/geo+json'}));
      link.href=url;link.download='sure_step_demo_geofences.geojson';document.body.appendChild(link);link.click();setTimeout(()=>{URL.revokeObjectURL(url);link.remove();},500);toast('Demo GeoJSON exported.');
    }
  }
  const pages=[['overview','Dashboard','grid'],['map','Live Tracking','map'],['fleet','My Fleet','ship'],['rentals','Rentals','calendar'],['maintenance','Maintenance','wrench'],['engine','Engine Monitoring','gauge'],['reports','Reports','chart'],['alerts','Alerts','bell'],['settings','Settings','settings']];
  const getBoat=id=>state.boats.find(x=>x.id===id);
  const getName=id=>getBoat(id)?.name||id;
  const activeRentals=()=>state.rentals.filter(r=>r.status==='active');
  const activeAlerts=()=>state.alerts.filter(a=>a.status==='open');
  const taskSeverity=t=>{let b=getBoat(t.boatId);if(t.dueHours!=null)return b.hours>=t.dueHours?'overdue':t.dueHours-b.hours<=12?'pending':'complete';if(t.dueDate){let delta=(new Date(t.dueDate+'T12:00:00')-new Date())/86400000;return delta<0?'overdue':delta<=30?'pending':'complete'}return 'complete'};
  const needsService=()=>state.maintenance.filter(t=>taskSeverity(t)!=='complete');
  const chip=(status,text)=>`<span class="status-chip ${esc(status)}">${esc(text||({rented:'On Rental',docked:'At Dock',service:'Maintenance',alert:'Outside Zone',overdue:'Overdue',pending:'Due Soon',complete:'Completed',open:'Open',acknowledged:'Acknowledged',resolved:'Resolved'}[status]||status))}</span>`;
  const simpleTime=()=>new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
  const toast=message=>{const root=document.getElementById('toastRoot');root.innerHTML=`<div class="toast">${esc(message)}</div>`;setTimeout(()=>{root.innerHTML=''},3200)};
  function navbar(){document.getElementById('nav').innerHTML=`<div class="nav-list">${pages.map(([id,label,ic])=>`<button class="nav-link ${ui.page===id?'active':''}" data-action="nav" data-page="${id}">${icon(ic)}<span>${label}</span>${id==='alerts'&&activeAlerts().length?`<span class="nav-pill">${activeAlerts().length}</span>`:''}</button>`).join('')}</div>`;}
  function header(title,desc='',buttons=''){return `<div class="page-heading"><div><div class="eyebrow">Sure Step Marine / Fleet Manager</div><h1>${title}</h1><div class="subheading">${desc}</div></div><div class="heading-actions">${buttons}</div></div>`;}
  function metric(label,value,foot,ic,tone=''){return `<div class="card kpi"><div class="kpi-top"><div class="kpi-label">${label}</div><div class="kpi-icon ${tone}">${icon(ic)}</div></div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`;}
  function boatMap(large=false){
    return `<div class="satellite-map-frame ${large?'is-large':''}"><div id="fleetSatelliteMap" class="satellite-map" role="application" aria-label="Interactive satellite map with simulated boat positions and editable polygon geofences"><div class="map-load-error">Loading satellite imagery…</div></div>
    <label class="map-source-control" for="mapSourceSelect">Map imagery <select id="mapSourceSelect" aria-label="Choose map imagery provider"><option value="esri" ${selectedMapSource==='esri'?'selected':''}>Satellite · Esri</option><option value="usgs" ${selectedMapSource==='usgs'?'selected':''}>Aerial · USGS</option><option value="streets" ${selectedMapSource==='streets'?'selected':''}>Streets · OSM</option></select></label>
    <div id="mapImageryStatus" class="map-imagery-status" role="status" aria-live="polite" hidden></div>
    <div class="map-zoom-hint">Scroll over map to zoom · or use + / −</div>
    <div class="satellite-watermark">DEMO POSITIONS · NOT FOR NAVIGATION</div></div><div class="map-legend"><span><span class="legend-dot"></span> Underway</span><span><span class="legend-dot docked"></span> Dock / service</span><span><span class="legend-dot alert"></span> Alert</span><span><span class="legend-dash"></span> Saved polygon</span></div><div class="map-tools-row"><button class="btn secondary map-diagnostic-button" data-action="map-diagnostics">Test map connection</button><span>Live imagery needs access to external tile servers. The map stays interactive while imagery is unavailable.</span></div><div id="mapTestResults" class="map-test-results" aria-live="polite" hidden></div>`;
  }
  function boundaryEditor(){const zone=getZone();return `<div class="card panel zone-editor"><div class="panel-head"><div><h2 class="panel-title">Polygon Geofences</h2><div class="panel-subtitle">Click corner to corner, then click your first point again to close</div></div></div><div class="panel-body">
    <div class="zone-control"><label for="zoneSelect">Saved operating areas</label><select class="select" id="zoneSelect"><option value="">— New area —</option>${state.geofences.map(z=>`<option value="${esc(z.id)}" ${ui.activeZone===z.id?'selected':''}>${esc(z.name)}</option>`).join('')}</select></div>
    <div class="zone-control"><label for="zoneName">Boundary name</label><input id="zoneName" type="text" maxlength="75" placeholder="e.g. Inshore rentals" value="${esc(zone?.name||'')}" /></div>
    <div class="zone-button-row"><button class="btn primary" data-action="zone-new">${icon('plus',14)} Draw New</button><button class="btn secondary" data-action="zone-edit" ${!zone?'disabled':''}>Edit Corners</button></div>
    <div class="zone-button-row"><button class="btn secondary" data-action="zone-fit" ${!zone?'disabled':''}>Fit Boundary</button><button class="btn secondary" data-action="zone-export">Export GeoJSON</button></div>
    <div class="zone-guidance"><span id="zoneModeBadge" class="zone-mode">VIEW MODE</span><p id="zoneHelp">Select a saved boundary, or start a new one. Satellite imagery is not a navigation chart.</p></div>
    <div class="zone-button-row" data-zone-editing hidden><button id="savePolygonBtn" class="btn primary" data-action="zone-save" disabled>Save Polygon</button><button class="btn secondary" data-action="zone-cancel">Cancel</button></div>
    <div class="zone-assignment-head"><strong>Assigned boats</strong><small>${zone?`${(zone.boatIds||[]).length} selected`:'Select a boundary or draw a new one'}</small></div>
    <div class="zone-boats">${state.boats.map(b=>`<label><input type="checkbox" class="zone-boat" value="${esc(b.id)}" ${zone?.boatIds?.includes(b.id)?'checked':''}/><span>${esc(b.name)}</span><small>${esc(b.id)}</small></label>`).join('')}</div>
    <div class="zone-button-row"><button class="btn secondary" data-action="zone-assign" ${!zone?'disabled':''}>Save Assignments</button><button class="btn danger-outline" data-action="zone-remove" ${!zone?'disabled':''}>Delete Boundary</button></div>
    <p class="zone-disclaimer">Saved only in this browser. No geofences are being sent to a physical tracker. For production, boundaries need server synchronization, GPS accuracy handling, and crossing confirmation.</p>
    </div></div>`;}
  function alertList(limit){let list=state.alerts.filter(a=>a.status!=='resolved').slice(0,limit||99);return list.length?`<div class="event-list">${list.map(a=>`<div class="event"><div class="event-icon ${a.level==='red'?'red':'amber'}">${icon(a.level==='red'?'warning':'bell')}</div><div class="event-text"><div class="event-top"><strong>${esc(a.type)}</strong><time>${esc(a.time)}</time></div><p>${esc(a.detail)}</p><div class="event-actions"><button class="text-link" data-action="open-boat" data-boat="${esc(a.boatId)}">${esc(getName(a.boatId))} ${icon('arrow',12)}</button>${a.status==='open'?`<button class="text-link" data-action="ack-alert" data-id="${a.id}">Acknowledge</button>`:''}</div></div></div>`).join('')}</div>`:'<div class="empty">No active alerts. All clear.</div>'}
  function boatTable(boats,limit=99){return `<div class="table-scroll"><table class="data-table"><thead><tr><th>BOAT</th><th>STATUS</th><th>ENGINE</th><th>ENGINE HOURS</th><th>BATTERY</th><th></th></tr></thead><tbody>${boats.slice(0,limit).map(b=>`<tr><td class="link-cell" data-action="open-boat" data-boat="${b.id}">${esc(b.name)}</td><td>${chip(b.status)}</td><td>${esc(b.engine)}</td><td>${fmtHours(b.hours)} hrs</td><td>${b.voltage.toFixed(1)} V</td><td class="table-actions"><button class="table-action" data-action="open-boat" data-boat="${b.id}">View ${icon('arrow',12)}</button></td></tr>`).join('')}</tbody></table></div>`;}
  function overview(){let rented=activeRentals().length;return `${header('Fleet Command Center','Your entire rental operation, in one place.',`<button class="btn secondary" data-action="simulate-move">${icon('locate')} Simulate GPS Update</button><button class="btn primary" data-action="new-rental">${icon('plus')} Start Rental</button>`)}<div class="notice-compact">${icon('alert')} Interactive demonstration — all boat locations, engine data, alerts and customer records are simulated and saved locally in this browser.</div><div class="kpi-grid">${metric('Total Fleet',state.boats.length,'8 pontoons · 4 skiffs','ship')}${metric('Active Rentals',rented,'Boats currently assigned','locate')}${metric('Service Attention',needsService().length,'Due soon or overdue','wrench','amber')}${metric('Active Alerts',activeAlerts().length,'Require staff attention','bell','red')}</div><div class="overview-grid"><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Live Fleet Map</h2><div class="panel-subtitle">Satellite view · select markers for boat details</div></div><button class="text-link" data-action="nav" data-page="map">Full map ${icon('arrow',14)}</button></div><div class="panel-body">${boatMap()}</div></div><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Priority Alerts</h2><div class="panel-subtitle">Operational events needing attention</div></div><button class="text-link" data-action="nav" data-page="alerts">View all ${icon('arrow',14)}</button></div><div class="panel-body">${alertList(4)}</div></div></div><div class="card"><div class="table-card-head"><div><div class="panel-title">Fleet Overview</div><div class="panel-subtitle">Equipment status and latest available readings</div></div><button class="text-link" data-action="nav" data-page="fleet">All boats ${icon('arrow',14)}</button></div>${boatTable(state.boats,7)}</div>${footer()}`;}
  function mapPage(){const watched=rankedWatchlist(),outsideCount=watched.filter(entry=>entry.position==='Outside').length;return `${header('Live Fleet Tracking','Satellite tracking and custom polygon operating areas.',`<button class="btn secondary" data-action="simulate-move">${icon('locate')} Simulate GPS</button><button class="btn secondary" data-action="simulate-breach">${icon('warning')} Simulate Breach</button>`)}
    <div class="notice-compact">${icon('alert')} Satellite imagery is real; all boat positions are simulated. Saved boundaries are local demo data and must not be used for navigation or insurance compliance.</div>
    <div class="satellite-layout fleet-tracking-workspace"><div class="card panel tracking-map-card"><div class="panel-head"><div><h2 class="panel-title">Fleet Satellite Map</h2><div class="panel-subtitle">Murrells Inlet, SC · Demo fleet positions</div></div><div class="tracking-map-actions">${chip('rented','Simulated feed')}<button class="btn primary" id="toggleZonePanelButton" type="button" data-action="toggle-zone-panel" aria-controls="zoneDrawer" aria-expanded="${ui.zonePanelOpen}">${ui.zonePanelOpen?'Hide':'Edit'} Geofences</button></div></div><div class="panel-body">${boatMap(true)}</div></div><aside class="zone-editor-drawer" id="zoneDrawer" aria-label="Geofence editing tools" ${ui.zonePanelOpen?'':'hidden'}><div class="zone-drawer-title"><strong>Operating Area Editor</strong><button class="icon-button" type="button" data-action="toggle-zone-panel" aria-label="Close geofence editor">${icon('close')}</button></div>${boundaryEditor()}</aside></div>
    <div class="card" style="margin-top:20px"><div class="table-card-head"><div><h2 class="panel-title">Fleet Watchlist</h2><div class="panel-subtitle">Polygon checks use demo positions only; GPS and alerts are not live</div><div class="watchlist-summary"><span class="watchlist-count ${outsideCount?'has-outside':''}">${outsideCount} outside geofence</span><span class="watchlist-order">Outside vessels automatically sorted first</span></div></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>VESSEL</th><th>BOAT STATUS</th><th>BOUNDARY</th><th>MAP POSITION</th><th></th></tr></thead><tbody>${watched.map(({b,z,position})=>{return `<tr class="${position==='Outside'?'watchlist-outside':''}"><td>${esc(b.name)}${position==='Outside'?'<span class="watchlist-priority">PRIORITY</span>':''}</td><td>${chip(b.status)}</td><td>${esc(z?.name||'None')}</td><td><span class="map-position-state ${position.toLowerCase().replace(' ','-')}">${position}</span></td><td><button class="table-action" data-action="open-boat" data-boat="${esc(b.id)}">View ${icon('arrow',12)}</button></td></tr>`;}).join('')}</tbody></table></div></div>${footer()}`;}
  function fleet(){let boats=state.boats.filter(b=>(ui.filter==='all'||b.status===ui.filter)&&(!ui.search||`${b.name} ${b.engine} ${b.id}`.toLowerCase().includes(ui.search.toLowerCase())));return `${header('My Fleet','View all boats, engine information and maintenance status.',`<button class="btn secondary" data-action="nav" data-page="maintenance">${icon('wrench')} Maintenance Center</button>`)}<div class="card" style="padding:16px 19px;margin-bottom:20px"><div class="flex-row" style="flex-wrap:wrap"><div class="filters"><span class="searchbox">${icon('search')}<input aria-label="Search boats" id="boatSearch" placeholder="Search boats or engines" value="${esc(ui.search)}"></span><select class="select" id="statusFilter" aria-label="Filter fleet by status"><option value="all" ${ui.filter==='all'?'selected':''}>All statuses</option>${['rented','docked','service','alert'].map(s=>`<option value="${s}" ${ui.filter===s?'selected':''}>${({rented:'On rental',docked:'At dock',service:'Maintenance',alert:'Outside zone'})[s]}</option>`).join('')}</select></div><span class="subtle">Showing ${boats.length} of ${state.boats.length} boats</span></div></div><div class="fleet-grid">${boats.map(b=>`<div class="card boat-card" data-action="open-boat" data-boat="${b.id}" role="button" tabindex="0"><div class="boat-card-top"><div class="boat-icon">${icon('ship',23)}</div>${chip(b.status)}</div><h3>${esc(b.name)}</h3><div class="boat-meta">${esc(b.engine)} · ${b.year}</div><div class="boat-stats"><div><small>Engine Hours</small><strong>${fmtHours(b.hours)} hrs</strong></div><div><small>Battery</small><strong>${b.voltage.toFixed(1)} V</strong></div><div><small>Engine Data</small><strong style="font-size:11px">${b.engineConnected?'Connected':'GPS only'}</strong></div><div><small>Tracker</small><strong style="font-size:11px">${esc(b.device)}</strong></div></div></div>`).join('')||'<div class="empty">No boats match your filters.</div>'}</div>${footer()}`;}
  function serviceProgress(b){let tasks=state.maintenance.filter(t=>t.boatId===b.id&&t.dueHours!=null).sort((a,c)=>a.dueHours-c.dueHours);let t=tasks[0];if(!t)return `<div class="callout">No engine-hour service scheduled yet. Create one in Maintenance.</div>`;let remaining=t.dueHours-b.hours;let previousService=t.lastServiceHours!=null?t.lastServiceHours:t.dueHours-(t.interval||100);let sinceService=Math.max(0,b.hours-previousService);let fraction=Math.min(100,Math.max(0,100*sinceService/(t.interval||100)));return `<div class="flex-row mb-16"><strong style="font-size:12px">${esc(t.title)}</strong>${chip(taskSeverity(t))}</div><div class="progress-track"><span class="${remaining<12?'warn':''}" style="width:${Math.round(fraction)}%"></span></div><div class="flex-row mt-14"><span class="subtle">${fmtHours(sinceService)} hrs since service</span><span class="subtle">Next ${fmtHours(t.dueHours)} hrs</span></div><div class="callout ${remaining<12?'warn':''} mt-14">${remaining<0?`${fmtHours(-remaining)} hours overdue`:`${fmtHours(remaining)} engine hours remaining`} until scheduled service.</div>`;}
  function boatDetail(){const b=getBoat(ui.boatId)||state.boats[0];if(!b)return '';const subtabs=[['overview','Overview'],['maintenance','Service Log'],['trips','Rentals'],['rpm','Engine & RPM']];const bRecords=state.records.filter(r=>r.boatId===b.id).sort((a,z)=>z.date.localeCompare(a.date));const bRentals=state.rentals.filter(r=>r.boatId===b.id);let content='';
    if(ui.boatTab==='overview'){content=`<div class="detail-grid"><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Boat Information</h2><div class="panel-subtitle">Hardware, engine and tracking status</div></div></div><div class="panel-body"><div class="info-list">${[['Boat ID',b.id],['Vessel type',b.type],['Engine',b.engine],['Model year',b.year],['GPS device',b.device],['Engine monitoring',b.engineConnected?'Connected':'Not installed'],['Last position received',b.lastUpdate],['Power source','12V DC · three-wire harness']].map(([l,v])=>`<div class="info-row"><span>${l}</span><strong>${esc(v)}</strong></div>`).join('')}</div></div></div><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Next Scheduled Service</h2><div class="panel-subtitle">Automated engine hours when available</div></div></div><div class="panel-body">${serviceProgress(b)}<div class="mt-20"><button class="btn secondary" data-action="new-service" data-boat="${b.id}">${icon('plus')} Add Service Record</button></div></div></div></div><div class="card panel mt-20"><div class="panel-head"><div><h2 class="panel-title">Latest Maintenance Activity</h2><div class="panel-subtitle">Linked to this boat</div></div><button class="text-link" data-action="boat-tab" data-tab="maintenance">Full history ${icon('arrow',13)}</button></div><div class="panel-body">${bRecords.slice(0,3).map(r=>`<div class="info-row"><span>${esc(r.date)} · ${esc(r.title)}</span><strong>${money(r.cost)}</strong></div>`).join('')||'<div class="empty">No service records.</div>'}</div></div>`;}
    if(ui.boatTab==='maintenance'){content=`<div class="card"><div class="table-card-head"><div><div class="panel-title">Maintenance History</div><div class="panel-subtitle">All services recorded on ${esc(b.name)}</div></div><button class="btn primary small" data-action="new-service" data-boat="${b.id}">${icon('plus')} Add Service</button></div>${serviceTable(bRecords)}</div><div class="card panel mt-20"><div class="panel-head"><div><h2 class="panel-title">Open Service Schedule</h2></div><button class="btn secondary small" data-action="new-task" data-boat="${b.id}">Add Schedule</button></div><div class="panel-body">${maintenanceTasks(state.maintenance.filter(t=>t.boatId===b.id))}</div></div>`;}
    if(ui.boatTab==='trips'){content=`<div class="card"><div class="table-card-head"><div><div class="panel-title">Rental Session History</div><div class="panel-subtitle">Trips assigned to this vessel</div></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>SESSION</th><th>GUEST</th><th>START</th><th>EXPECTED RETURN</th><th>STATUS</th></tr></thead><tbody>${bRentals.map(r=>`<tr><td>${esc(r.id)}</td><td>${esc(r.guest)}</td><td>${esc(r.start)}</td><td>${esc(r.return)}</td><td>${chip(r.status==='active'?'rented':'complete',r.status==='active'?'Active':'Closed')}</td></tr>`).join('')||'<tr><td colspan="5">No rental history.</td></tr>'}</tbody></table></div></div>`;}
    if(ui.boatTab==='rpm'){content=engineDetail(b);}
    return `${header(esc(b.name),`${esc(b.engine)} · ${esc(b.id)} · ${esc(b.device)}`,`<button class="btn secondary" data-action="nav" data-page="fleet">${icon('back')} All Boats</button><button class="btn primary" data-action="new-service" data-boat="${b.id}">${icon('plus')} Log Service</button>`)}<div class="detail-hero"><div class="detail-info"><div class="boat-icon" style="width:54px;height:54px">${icon('ship',28)}</div><div><div class="detail-name">${esc(b.name)}</div><div class="detail-meta">${esc(b.type)} · ${b.year} · ${esc(b.engine)}</div></div></div>${chip(b.status)}</div><div class="stat-strip"><div class="stat-box"><small>Operating Hours</small><strong>${fmtHours(b.hours)}</strong><span class="unit">hrs</span></div><div class="stat-box"><small>Battery Voltage</small><strong>${b.voltage.toFixed(1)}</strong><span class="unit">V</span></div><div class="stat-box"><small>Current Speed</small><strong>${b.speed}</strong><span class="unit">mph</span></div><div class="stat-box"><small>Last Trip Max RPM</small><strong>${b.engineConnected?b.maxRpm.toLocaleString():'—'}</strong></div></div><div class="boat-location-card card panel"><div class="panel-head"><div><h2 class="panel-title">Boat Location · Satellite</h2><div class="panel-subtitle">Current simulated position · ${esc(b.lastUpdate)}</div></div><button class="btn secondary small" data-action="show-boat-on-map" data-boat="${esc(b.id)}">Open Fleet Map</button></div><div class="panel-body"><div id="boatProfileSatelliteMap" class="boat-profile-satellite-map" role="application" aria-label="Satellite map centered on ${esc(b.name)}"></div><div class="boat-location-footer">${esc(coordForBoat(b)[0].toFixed(5))}°, ${esc(coordForBoat(b)[1].toFixed(5))}° · ${zoneForBoat(b)?(isOutsideGeofence(b)?'Outside assigned geofence':'Inside assigned geofence'):'No assigned geofence'} · Demo data only</div></div></div><div class="tabs">${subtabs.map(([id,label])=>`<button class="tab ${ui.boatTab===id?'active':''}" data-action="boat-tab" data-tab="${id}">${label}</button>`).join('')}</div>${content}${footer()}`;
  }
  function serviceTable(records){return `<div class="table-scroll"><table class="data-table"><thead><tr><th>DATE</th><th>BOAT</th><th>SERVICE PERFORMED</th><th>ENGINE HRS</th><th>TECHNICIAN</th><th>COST</th></tr></thead><tbody>${records.map(r=>`<tr><td>${esc(r.date)}</td><td class="link-cell" data-action="open-boat" data-boat="${esc(r.boatId)}">${esc(getName(r.boatId))}</td><td><strong style="color:#305464">${esc(r.title)}</strong>${r.notes?`<div class="subtle">${esc(r.notes)}</div>`:''}</td><td>${fmtHours(r.hours)}</td><td>${esc(r.technician)}</td><td>${money(r.cost)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No maintenance records yet.</td></tr>'}</tbody></table></div>`;}
  function maintenanceTasks(tasks){return tasks.length?tasks.map(t=>{let sev=taskSeverity(t);let b=getBoat(t.boatId);return `<div class="event"><div class="event-icon ${sev==='overdue'?'red':sev==='pending'?'amber':''}">${icon('wrench')}</div><div class="event-text"><div class="event-top"><strong>${esc(t.title)}</strong>${chip(sev,sev==='complete'?'Scheduled':sev==='pending'?'Due Soon':'Overdue')}</div><p>${esc(b.name)} · ${t.dueHours!=null?`${fmtHours(b.hours)} / ${fmtHours(t.dueHours)} engine hrs`:`Due ${esc(t.dueDate)}`}</p><div class="event-actions"><button class="text-link" data-action="complete-task" data-id="${esc(t.id)}">Mark serviced ${icon('check',12)}</button><button class="text-link" data-action="open-boat" data-boat="${esc(b.id)}">Boat profile ${icon('arrow',12)}</button></div></div></div>`}).join(''):'<div class="empty">No scheduled maintenance.</div>'}
  function maintenancePage(){const records=[...state.records].sort((a,z)=>z.date.localeCompare(a.date));const alerts=needsService();return `${header('Maintenance Center','Keep every boat service-ready with a complete digital history.',`<button class="btn secondary" data-action="new-task">${icon('calendar')} Schedule Maintenance</button><button class="btn primary" data-action="new-service">${icon('plus')} Log Completed Service</button>`)}<div class="kpi-grid">${metric('Open Schedules',state.maintenance.length,'Fleet-wide upcoming tasks','calendar')}${metric('Needs Attention',alerts.length,'Overdue or approaching','warning','amber')}${metric('Service Records',state.records.length,'Documented maintenance events','file')}${metric('Recorded Service Cost',money(state.records.reduce((s,r)=>s+Number(r.cost||0),0)),'Sum of sample service entries','dollar')}</div><div class="section-grid"><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Scheduled Maintenance</h2><div class="panel-subtitle">Hour-based and calendar-based reminders</div></div></div><div class="panel-body">${maintenanceTasks([...state.maintenance].sort((a,b)=>['overdue','pending','complete'].indexOf(taskSeverity(a))-['overdue','pending','complete'].indexOf(taskSeverity(b))))}</div></div><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Service Workflow</h2><div class="panel-subtitle">What happens when maintenance is completed</div></div></div><div class="panel-body"><div class="activity-timeline"><div class="timeline-item"><strong>1. Service becomes due</strong><p>Hours or calendar threshold flags the boat.</p></div><div class="timeline-item"><strong>2. Staff completes work</strong><p>Record technician, hours, parts, cost, and notes.</p></div><div class="timeline-item"><strong>3. Service is recorded</strong><p>History is permanently attached to the boat profile.</p></div><div class="timeline-item"><strong>4. Next interval is scheduled</strong><p>Recurring hour-based tasks advance automatically.</p></div></div><div class="callout mt-20">GPS-only customers can enter hours manually. When optional RPM hardware is connected, run hours can be collected automatically after validation.</div></div></div></div><div class="card mt-20"><div class="table-card-head"><div><h2 class="panel-title">Fleet Maintenance Log</h2><div class="panel-subtitle">Completed work, parts and costs</div></div><button class="text-link" data-action="new-service">Add service ${icon('plus',13)}</button></div>${serviceTable(records)}</div>${footer()}`;}
  function rentalsPage(){return `${header('Rental Sessions','Assign boats, monitor active outings and document each return.',`<button class="btn primary" data-action="new-rental">${icon('plus')} Start Rental</button>`)}<div class="kpi-grid">${metric('Active Rentals',activeRentals().length,'Currently in progress','ship')}${metric('Available at Dock',state.boats.filter(b=>b.status==='docked').length,'Ready for assignment','check')}${metric('Under Maintenance',state.boats.filter(b=>b.status==='service').length,'Not available for rental','wrench','amber')}${metric('Rental Records',state.rentals.length,'Demo sessions total','calendar')}</div><div class="card"><div class="table-card-head"><div><h2 class="panel-title">Current & Previous Rentals</h2><div class="panel-subtitle">Demo guest names are fictional</div></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>SESSION</th><th>BOAT</th><th>RENTER</th><th>DEPARTED</th><th>EXPECTED RETURN</th><th>STATUS</th><th></th></tr></thead><tbody>${state.rentals.map(r=>`<tr><td>${esc(r.id)}</td><td class="link-cell" data-action="open-boat" data-boat="${esc(r.boatId)}">${esc(getName(r.boatId))}</td><td>${esc(r.guest)}</td><td>${esc(r.start)}</td><td>${esc(r.return)}</td><td>${chip(r.status==='active'?'rented':'complete',r.status==='active'?'Active':'Completed')}</td><td>${r.status==='active'?`<button class="table-action" data-action="close-rental" data-id="${r.id}">Close Rental ${icon('check',12)}</button>`:'—'}</td></tr>`).join('')}</tbody></table></div></div><div class="thin-note">Production release will add return inspections, damage photos, late-return notifications and renter-access permissions. This demo currently supports starting and closing rental sessions.</div>${footer()}`;}
  function rpmPlot(b){let max=Math.max(6000,b.maxRpm+100);const samples=b.engineConnected?[750,1200,3150,3920,4270,3950,5150,b.maxRpm||5500,4000,3300,1100,700]:[0,0,0,0,0,0,0,0,0,0,0,0];let points=samples.map((v,i)=>`${45+i*(610/(samples.length-1))},${177-140*v/max}`).join(' ');return `<div class="chart-area"><svg viewBox="0 0 700 200" preserveAspectRatio="none" role="img" aria-label="Simulated engine RPM chart"><g stroke="#e2ecee" stroke-width="1">${[0,1,2,3].map(i=>`<path d="M42 ${33+i*47}H678"/>`).join('')}</g><g font-size="12" fill="#93a6b0" font-family="Arial">${[0,2000,4000,6000].map((v,i)=>`<text x="6" y="${182-i*46.8}">${v===0?'0':v/1000+'k'}</text>`).join('')}</g><polyline fill="none" stroke="#238b89" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>${samples.map((v,i)=>`<circle cx="${45+i*610/(samples.length-1)}" cy="${177-140*v/max}" r="2.8" fill="#238b89"/>`).join('')}</svg></div><div class="chart-labels"><span>Trip start</span><span>Mid-trip</span><span>Trip end</span></div>`;}
  function engineDetail(b){const events=state.rpmEvents.filter(e=>e.boatId===b.id);return `<div class="detail-grid"><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">RPM History</h2><div class="panel-subtitle">Simulated sample trip profile</div></div>${b.engineConnected?chip('rented','Engine data enabled'):chip('docked','Not installed')}</div><div class="panel-body">${b.engineConnected?rpmPlot(b):'<div class="empty">This boat has the GPS-only package. Engine monitoring is optional.</div>'}<div class="flex-row mt-20"><div><span class="small-label">Last trip maximum RPM</span><div style="font-size:25px;font-weight:800">${b.engineConnected?b.maxRpm.toLocaleString():'—'}</div></div><div><span class="small-label">Engine hours</span><div style="font-size:25px;font-weight:800">${fmtHours(b.hours)}</div></div></div></div></div><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">RPM & Maintenance Alerts</h2><div class="panel-subtitle">Trip-linked events and usage warnings</div></div></div><div class="panel-body">${events.length?events.map(e=>`<div class="event"><div class="event-icon red">${icon('warning')}</div><div class="event-text"><strong>Excessive RPM: ${e.rpm.toLocaleString()}</strong><p>${esc(e.date)} · ${esc(e.time)} · ${esc(e.duration)} above ${e.limit.toLocaleString()} RPM limit</p></div></div>`).join(''):'<div class="empty">No recorded high-RPM events in this demo.</div>'}<div class="divider"></div><div class="small-label mb-16">Next service</div>${serviceProgress(b)}</div></div></div>`;}
  function enginePage(){const b=getBoat(ui.engineBoat)||state.boats.find(b=>b.engineConnected);const connected=state.boats.filter(x=>x.engineConnected).length;return `${header('Engine Monitoring','Operating hours, peak RPM, event history and maintenance triggers.',`<button class="btn secondary" data-action="simulate-rpm">${icon('activity')} Simulate RPM Event</button>`)}<div class="kpi-grid">${metric('Engines Connected',connected,'Sample RPM-enabled boats','gauge')}${metric('GPS-only Boats',state.boats.length-connected,'Can be upgraded later','ship')}${metric('Recorded RPM Events',state.rpmEvents.length,'Review engine-use exceptions','warning','amber')}${metric('Fleet Operating Hours',fmtHours(state.boats.reduce((s,b)=>s+b.hours,0)),'Demo hours across all boats','clock')}</div><div class="card panel mb-16"><div class="panel-head"><div><h2 class="panel-title">Selected Boat</h2><div class="panel-subtitle">RPM monitoring is an optional add-on</div></div><select class="select" id="engineBoatSelect" aria-label="Select boat to view engine data">${state.boats.map(x=>`<option value="${x.id}" ${x.id===b.id?'selected':''}>${esc(x.name)} · ${esc(x.engine)}</option>`).join('')}</select></div><div class="panel-body">${engineDetail(b)}</div></div><div class="card"><div class="table-card-head"><div><div class="panel-title">Recorded Excessive RPM Events</div><div class="panel-subtitle">Event limit will be configured by engine model in production</div></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>DATE</th><th>BOAT</th><th>PEAK RPM</th><th>THRESHOLD</th><th>DURATION</th><th>TIME</th></tr></thead><tbody>${state.rpmEvents.map(e=>`<tr><td>${esc(e.date)}</td><td class="link-cell" data-action="open-boat" data-boat="${e.boatId}">${esc(getName(e.boatId))}</td><td><strong>${e.rpm.toLocaleString()}</strong></td><td>${e.limit.toLocaleString()}</td><td>${esc(e.duration)}</td><td>${esc(e.time)}</td></tr>`).join('')||'<tr><td colspan="6">No events recorded.</td></tr>'}</tbody></table></div></div>${footer()}`;}
  function reportsPage(){const counts={rented:activeRentals().length,docked:state.boats.filter(b=>b.status==='docked').length,service:state.boats.filter(b=>b.status==='service').length,alert:state.boats.filter(b=>b.status==='alert').length};let costs=state.boats.map(b=>({name:b.name,cost:state.records.filter(r=>r.boatId===b.id).reduce((s,r)=>s+Number(r.cost||0),0)})).sort((a,b)=>b.cost-a.cost).slice(0,6);let max=Math.max(1,...costs.map(c=>c.cost));return `${header('Fleet Reports','Maintenance costs, utilization and operating snapshots.',`<button class="btn secondary" data-action="export-csv">${icon('upload')} Export Service CSV</button>`)}<div class="kpi-grid">${metric('Total Engine Hours',fmtHours(state.boats.reduce((s,b)=>s+b.hours,0)),'Manual and simulated hours','clock')}${metric('Total Service Spend',money(state.records.reduce((s,r)=>s+Number(r.cost||0),0)),'Across recorded services','dollar')}${metric('Fleet Utilization',Math.round(100*activeRentals().length/state.boats.length)+'%','Share on active rental','chart')}${metric('Fleet Size',state.boats.length,'Boats assigned to account','ship')}</div><div class="section-grid"><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Fleet Status Mix</h2><div class="panel-subtitle">Current demo boat assignments</div></div></div><div class="panel-body">${[['On rental',counts.rented,'#288f88'],['At dock',counts.docked,'#94a9b0'],['Maintenance',counts.service,'#d6a05d'],['Geofence alert',counts.alert,'#e16c56']].map(([l,v,c])=>`<div style="margin:15px 0"><div class="flex-row" style="font-size:11px"><strong>${l}</strong><span>${v} boats</span></div><div class="progress-track mt-14"><span style="width:${100*v/state.boats.length}%;background:${c}"></span></div></div>`).join('')}</div></div><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Maintenance Spending by Boat</h2><div class="panel-subtitle">Based on current service log records</div></div></div><div class="panel-body"><div class="report-bars-wrap"><div class="report-bars">${costs.map(c=>`<div class="report-bar-col" title="${esc(c.name)} · ${money(c.cost)}"><span style="font-size:10px;color:#6e9095">${money(c.cost)}</span><div class="report-bar" style="height:${Math.max(3,140*c.cost/max)}px"></div><small>${esc(c.name.replace('Pontoon','PT').replace('Skiff','SK'))}</small></div>`).join('')}</div></div></div></div></div><div class="thin-note">Reports currently use simulated or manually entered records. A production service will add date-range filters, audited event history, real engine-hour aggregation and customizable exports.</div>${footer()}`;}
  function alertsPage(){return `${header('Fleet Alerts','Geofence warnings, power events and maintenance notifications.',`<button class="btn secondary" data-action="simulate-breach">${icon('warning')} Simulate Geofence Breach</button>`)}<div class="kpi-grid">${metric('Open Alerts',activeAlerts().length,'Require attention','bell','red')}${metric('Acknowledged',state.alerts.filter(a=>a.status==='acknowledged').length,'Assigned or reviewed','check')}${metric('Resolved',state.alerts.filter(a=>a.status==='resolved').length,'Already cleared','shield')}${metric('Geofence Breaches',state.alerts.filter(a=>a.type==='Geofence breach').length,'Demo alert history','map')}</div><div class="card"><div class="table-card-head"><div><h2 class="panel-title">Alert History</h2><div class="panel-subtitle">Notification status and associated boats</div></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>TIME</th><th>BOAT</th><th>EVENT</th><th>DETAILS</th><th>STATUS</th><th></th></tr></thead><tbody>${state.alerts.map(a=>`<tr><td>${esc(a.time)}</td><td class="link-cell" data-action="open-boat" data-boat="${a.boatId}">${esc(getName(a.boatId))}</td><td>${esc(a.type)}</td><td>${esc(a.detail)}</td><td>${chip(a.status)}</td><td>${a.status!=='resolved'?`<button class="table-action" data-action="${a.status==='open'?'ack-alert':'resolve-alert'}" data-id="${a.id}">${a.status==='open'?'Acknowledge':'Resolve'}</button>`:'—'}</td></tr>`).join('')}</tbody></table></div></div><div class="thin-note">No real emails or texts are sent from this demonstration. Production alerts will be routed through authorized messaging providers, with delivery logging and retry handling.</div>${footer()}`;}
  function settingsPage(){const s=state.settings;const toggles=[['geofence','Geofence alerts','Notify staff when a rented boat crosses the permitted boundary.'],['motion','Unauthorized movement alerts','Wake a parked tracker when movement is detected.'],['battery','Low-voltage monitoring','Warn when the last available battery reading is too low.'],['overrpm','Excessive RPM alerts','Only for boats with the optional tachometer interface.'],['autoMaintenance','Automatic engine-hour reminders','Generate upcoming service notifications from operating hours.'],['email','Email notifications','Enable email delivery after a provider is configured.'],['sms','Text notifications','Requires a production messaging integration.']];return `${header('Fleet Settings','Customize alert behavior, workspace preferences and reporting.',`<button class="btn secondary" data-action="reset-demo">${icon('close')} Reset Demo Data</button>`)}<div class="section-grid"><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Notification Preferences</h2><div class="panel-subtitle">Settings are stored locally for this prototype</div></div></div><div class="panel-body">${toggles.map(([key,name,desc])=>`<div class="setting-row"><div><strong>${name}</strong><p>${desc}</p></div><input class="switch" type="checkbox" aria-label="${name}" data-setting="${key}" ${s[key]?'checked':''}></div>`).join('')}</div></div><div class="card panel"><div class="panel-head"><div><h2 class="panel-title">Tracking Rules</h2><div class="panel-subtitle">Example configurable detection thresholds</div></div></div><div class="panel-body"><div class="field mb-16"><label for="batteryThreshold">Low boat-battery alert threshold</label><select id="batteryThreshold"><option value="11.8" ${s.batteryThreshold===11.8?'selected':''}>11.8 volts</option><option value="12" ${s.batteryThreshold===12?'selected':''}>12.0 volts</option><option value="12.2" ${s.batteryThreshold===12.2?'selected':''}>12.2 volts</option><option value="12.4" ${s.batteryThreshold===12.4?'selected':''}>12.4 volts</option></select><span class="help">Thresholds need field validation; voltage is not a universal state-of-charge measurement.</span></div><div class="field mb-16"><label for="geofenceBuffer">Boundary crossing confirmation</label><select id="geofenceBuffer"><option value="30" ${s.geofenceBuffer===30?'selected':''}>30 seconds</option><option value="60" ${s.geofenceBuffer===60?'selected':''}>60 seconds</option><option value="120" ${s.geofenceBuffer===120?'selected':''}>120 seconds</option></select><span class="help">Demo value only; actual server rules will avoid excessive false alarms.</span></div><button class="btn primary" data-action="save-settings">${icon('check')} Save Preferences</button><div class="callout mt-20">Subscription billing, team permissions and customer organizations are planned production integrations, not functional features in this demonstration.</div></div></div></div>${footer()}`;}
  const footer=()=>'<div class="demo-footer">SURE STEP MARINE · INTERACTIVE PRODUCT CONCEPT · SAMPLE DATA ONLY</div>';
  function render(){disposeMap();navbar();document.getElementById('crumbTitle').textContent=({'overview':'Dashboard','map':'Live Tracking','fleet':'My Fleet','boat':'Boat Profile','rentals':'Rentals','maintenance':'Maintenance','engine':'Engine Monitoring','reports':'Reports','alerts':'Alerts','settings':'Settings'})[ui.page]||'Dashboard';let page=({overview,map:mapPage,fleet,boat:boatDetail,rentals:rentalsPage,maintenance:maintenancePage,engine:enginePage,reports:reportsPage,alerts:alertsPage,settings:settingsPage})[ui.page]||overview;document.getElementById('appContent').innerHTML=`<div class="page-container ${ui.page==='map'?'page-tracking':''}">${page()}</div>`;document.getElementById('sidebar').classList.remove('open');initSatelliteMap();initBoatProfileMap();syncZoneButtons();}
  function openModal(type,boatId=''){ui.modal=type;const title=({service:'Log Completed Service',task:'Schedule Maintenance',rental:'Start Rental Session'})[type];let body='';const available=state.boats.filter(b=>b.status==='docked');const opts=arr=>arr.map(b=>`<option value="${b.id}" ${b.id===boatId?'selected':''}>${esc(b.name)} · ${esc(b.engine)}</option>`).join('');
    if(type==='service')body=`<div class="form-grid"><div class="field"><label for="mBoat">Boat</label><select id="mBoat" name="boat" required>${opts(state.boats)}</select></div><div class="field"><label for="mDate">Service date</label><input id="mDate" type="date" name="date" value="${nowDate()}" required></div><div class="field full"><label for="mTitle">Service performed</label><input id="mTitle" name="title" placeholder="Engine oil and filter change" required maxlength="120"></div><div class="field"><label for="mHours">Engine hours at service</label><input id="mHours" type="number" name="hours" min="0" step="0.1" value="${fmtHours((getBoat(boatId)||state.boats[0]).hours)}" required></div><div class="field"><label for="mCost">Total cost ($)</label><input id="mCost" type="number" name="cost" min="0" step="0.01" value="0" required></div><div class="field full"><label for="mTech">Technician / company</label><input id="mTech" name="technician" value="Marina Service" required maxlength="80"></div><div class="field full"><label for="mNotes">Notes / parts used</label><textarea id="mNotes" name="notes" placeholder="Parts, work performed, observations..."></textarea></div></div>`;
    if(type==='task')body=`<div class="form-grid"><div class="field"><label for="tBoat">Boat</label><select id="tBoat" name="boat" required>${opts(state.boats)}</select></div><div class="field"><label for="tMode">Schedule type</label><select id="tMode" name="mode"><option value="hours">Engine hours</option><option value="date">Calendar date</option></select></div><div class="field full"><label for="tTitle">Service task</label><input id="tTitle" name="title" placeholder="100-hour engine service" required maxlength="120"></div><div class="field"><label for="tHours">Due at engine hours (if hour-based)</label><input id="tHours" name="dueHours" type="number" min="0" step="0.1" value="500"></div><div class="field"><label for="tInterval">Repeat every (hours)</label><input id="tInterval" name="interval" type="number" min="0" step="1" value="100"></div><div class="field full"><label for="tDate">Calendar due date (if date-based)</label><input id="tDate" name="dueDate" type="date" value="${nowDate()}"></div></div><div class="thin-note">Only the selected scheduling method will be used. For demo, calendar tasks advance a year when marked completed.</div>`;
    if(type==='rental')body=`<div class="form-grid"><div class="field full"><label for="rBoat">Available boat</label><select id="rBoat" name="boat" required>${opts(available)}</select></div><div class="field full"><label for="rGuest">Renter / booking name</label><input id="rGuest" name="guest" placeholder="Demo Guest" required maxlength="80"></div><div class="field full"><label for="rReturn">Expected return time</label><input id="rReturn" name="return" type="time" value="16:00" required></div></div><div class="thin-note">This is a demonstration. No emails, renter agreements, payment processing or personal data verification occur.</div>`;
    document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop" data-action="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-head"><h2>${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close">${icon('close')}</button></div><form id="modalForm" data-kind="${type}"><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn secondary" type="button" data-action="close-modal">Cancel</button><button class="btn primary" type="submit">${type==='rental'?'Start Rental':'Save Record'}</button></div></form></div></div>`;
  }
  function closeModal(){ui.modal=null;document.getElementById('modalRoot').innerHTML=''};
  function addAlert(boatId,type,detail,level='red'){state.alerts.unshift({id:'A-'+Date.now(),boatId,type,detail,time:simpleTime(),level,status:'open'})};
  function action(type,el,ev){const id=el.dataset.id;const boatId=el.dataset.boat;switch(type){
    case 'map-diagnostics':testMapConnection();break;
    case 'show-boat-on-map':{const b=getBoat(boatId);if(b)mapView={center:coordForBoat(b),zoom:14};ui.page='map';render();window.scrollTo(0,0);break;}
    case 'toggle-zone-panel':{ui.zonePanelOpen=!ui.zonePanelOpen;const drawer=document.getElementById('zoneDrawer');if(drawer)drawer.hidden=!ui.zonePanelOpen;const trigger=document.getElementById('toggleZonePanelButton');if(trigger){trigger.setAttribute('aria-expanded',String(ui.zonePanelOpen));trigger.textContent=ui.zonePanelOpen?'Hide Geofences':'Edit Geofences';}break;}
    case 'zone-new':case 'zone-edit':case 'zone-save':case 'zone-assign':case 'zone-cancel':case 'zone-remove':case 'zone-export':case 'zone-fit':zoneAction(type.slice(5));break;
    case 'nav':ui.page=el.dataset.page;ui.search='';ui.filter='all';render();window.scrollTo(0,0);break;
    case 'open-boat':ui.boatId=boatId;ui.boatTab='overview';ui.page='boat';render();window.scrollTo(0,0);break;
    case 'boat-tab':ui.boatTab=el.dataset.tab;render();break;
    case 'new-service':openModal('service',boatId);break;
    case 'new-task':openModal('task',boatId);break;
    case 'new-rental':openModal('rental');break;
    case 'close-modal':closeModal();break;
    case 'backdrop':if(ev && ev.target===el)closeModal();break;
    case 'ack-alert':{const a=state.alerts.find(a=>a.id===id);if(a)a.status='acknowledged';save();render();toast('Alert acknowledged.');break}
    case 'resolve-alert':{const a=state.alerts.find(a=>a.id===id);if(a){a.status='resolved';let b=getBoat(a.boatId);if(b?.status==='alert')b.status='rented'}save();render();toast('Alert resolved.');break}
    case 'close-rental':{const r=state.rentals.find(r=>r.id===id);if(!r||!confirm(`Close the rental for ${getName(r.boatId)}?`))break;r.status='complete';const b=getBoat(r.boatId);if(b){b.status='docked';b.speed=0;b.rpm=0;b.x=252+Math.floor(Math.random()*26);b.y=300+Math.floor(Math.random()*35)}save();render();toast('Rental closed and boat marked at dock.');break}
    case 'complete-task':{let t=state.maintenance.find(t=>t.id===id);if(!t)break;let b=getBoat(t.boatId);if(!confirm(`Mark "${t.title}" completed for ${b.name}? A service record will be created.`))break;state.records.unshift({id:'S-'+Date.now(),boatId:b.id,title:t.title,date:nowDate(),hours:b.hours,cost:0,technician:'Marina Service',notes:'Completed from maintenance schedule; edit costs in production.'});if(t.dueHours!=null){t.lastServiceHours=b.hours;t.dueHours=b.hours+Math.max(1,t.interval||100)}else{const d=new Date(t.dueDate+'T12:00:00');d.setFullYear(d.getFullYear()+1);t.dueDate=d.toISOString().slice(0,10)}save();render();toast('Maintenance logged and next interval scheduled.');break}
    case 'simulate-move':{state.boats.filter(b=>['rented','alert'].includes(b.status)).forEach(b=>{b.x=Math.min(655,Math.max(300,b.x+(Math.random()*24-12)));b.y=Math.min(390,Math.max(58,b.y+(Math.random()*18-9)));b.lastUpdate='just now';b.speed=Math.max(4,Math.min(30,Math.round(b.speed+Math.random()*6-3)))});save();render();toast('Simulated new GPS positions for underway boats.');break}
    case 'simulate-breach':{const b=getBoat('PT-07');b.status='alert';b.x=660;b.y=105;b.speed=19;b.lastUpdate='just now';addAlert(b.id,'Geofence breach',`${b.name} crossed the permitted demo rental boundary.`);save();render();toast('Simulated geofence event added to alerts.');break}
    case 'simulate-rpm':{let b=getBoat(ui.engineBoat);if(!b.engineConnected){toast('Select a boat with the engine monitoring add-on.');break}let rpm=5750+Math.floor(Math.random()*350);b.maxRpm=Math.max(b.maxRpm,rpm);state.rpmEvents.unshift({id:'E-'+Date.now(),boatId:b.id,rpm,limit:5500,duration:'9 sec',time:simpleTime(),date:nowDate()});addAlert(b.id,'Excessive RPM',`${b.name} reached ${rpm.toLocaleString()} RPM.`,'amber');save();render();toast('Simulated engine RPM event recorded.');break}
    case 'reset-demo':if(confirm('Reset all sample data, maintenance entries, rentals and preferences?')){state=defaultState();ui.page='overview';ui.boatTab='overview';ui.activeZone=state.geofences[0]?.id||'';ui.zoneMode='view';ui.zoneDraft=[];ui.zoneClosed=false;ui.zonePanelOpen=false;save();render();toast('Sample fleet restored.')}break;
    case 'save-settings':{state.settings.batteryThreshold=Number(document.getElementById('batteryThreshold').value);state.settings.geofenceBuffer=Number(document.getElementById('geofenceBuffer').value);save();toast('Demo preferences saved locally.');break}
    case 'export-csv':{const cols=['Date','Boat','Service','Hours','Technician','Cost','Notes'];let lines=[cols,...state.records.map(r=>[r.date,getName(r.boatId),r.title,r.hours,r.technician,r.cost,r.notes])].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines],{type:'text/csv'}));a.download='sure_step_maintenance_log_demo.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Maintenance log CSV exported.');break}
  }}
  document.addEventListener('click',event=>{let el=event.target.closest('[data-action]');if(!el)return;action(el.dataset.action,el,event)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();if(event.key==='Enter'&&event.target.matches('[data-action].boat-card,[data-action].map-marker')){event.preventDefault();action(event.target.dataset.action,event.target)}});
  document.getElementById('mobileMenu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  document.addEventListener('change',event=>{
    if(event.target.id==='mBoat'){const b=getBoat(event.target.value);if(b && document.getElementById('mHours'))document.getElementById('mHours').value=fmtHours(b.hours)}
    if(event.target.id==='zoneSelect'){ui.activeZone=event.target.value;ui.zoneMode='view';ui.zoneDraft=[];ui.zoneClosed=false;render()}
    if(event.target.id==='mapSourceSelect')activateMapSource(event.target.value);
    if(event.target.id==='statusFilter'){ui.filter=event.target.value;render()}
    if(event.target.id==='boatSearch'){ui.search=event.target.value;render()}
    if(event.target.id==='engineBoatSelect'){ui.engineBoat=event.target.value;render()}
    if(event.target.dataset.setting){state.settings[event.target.dataset.setting]=event.target.checked;save();toast('Preference updated locally.')}
  });
  document.addEventListener('submit',event=>{if(event.target.id!=='modalForm')return;event.preventDefault();const form=new FormData(event.target);const kind=event.target.dataset.kind;const boatId=form.get('boat');const boat=getBoat(boatId);if(!boat){toast('Select a valid boat.');return}
    if(kind==='service'){
      const hours=Number(form.get('hours'));const cost=Number(form.get('cost'));if(!Number.isFinite(hours)||hours<0||!Number.isFinite(cost)||cost<0)return;
      state.records.unshift({id:'S-'+Date.now(),boatId,title:String(form.get('title')).trim(),date:form.get('date'),hours,cost,technician:String(form.get('technician')).trim(),notes:String(form.get('notes')).trim()});
      toast('Service record added to '+boat.name+'.');
    } else if(kind==='task'){
      const mode=form.get('mode');const t={id:'M-'+Date.now(),boatId,title:String(form.get('title')).trim(),dueHours:mode==='hours'?Number(form.get('dueHours')):null,interval:mode==='hours'?Number(form.get('interval')):0,dueDate:mode==='date'?String(form.get('dueDate')):'',status:'open'};
      if(mode==='hours'&&(!Number.isFinite(t.dueHours)||t.dueHours<0))return;
      state.maintenance.unshift(t);toast('Maintenance schedule created for '+boat.name+'.');
    } else if(kind==='rental'){
      if(boat.status!=='docked'){toast('Select a boat currently available at the dock.');return}
      let time=String(form.get('return'));let [hour,min]=time.split(':').map(Number);let returnTime=`${(hour%12)||12}:${String(min).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;
      state.rentals.unshift({id:'R-'+Date.now().toString().slice(-6),boatId,guest:String(form.get('guest')).trim(),start:simpleTime(),return:returnTime,status:'active'});
      boat.status='rented';boat.speed=7;boat.x=320+Math.round(Math.random()*80);boat.y=195+Math.round(Math.random()*70);
      toast('Rental started for '+boat.name+'.');
    }
    save();closeModal();render();
  });
  window.addEventListener('hashchange',()=>{const p=window.location.hash.slice(1);if(p==='overview'&&ui.page!=='overview'){ui.page='overview';render()}});
  render();
})();
