// PlantAR — Cloud Recognition + 3D Viewer
// (long descriptions + confidence gating + Explorer overlay)
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ImageBackground, Modal, Pressable, Platform } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import { HF_TOKEN, HF_MODEL } from './secrets';

// ---- Theme
const theme = { bg:'#0B1021', card:'#141B34', text:'#F5F7FB', textDim:'#B8C1EC', accent:'#7AE582', accentDark:'#51c467', highlight:'#FACC15' };

// ---- 10 flowers (with rich descriptions)
const PLANTS = {
  sunflower:{
    name:'Sunflower', emoji:'🌻',
    desc:'Tall, bright annual famous for heliotropism—young heads track the sun across the sky. Rough, broad leaves and a large, seed‑packed disk with golden ray petals. Seeds are edible and loved by birds.',
    habitat:'Open, sunny fields; well‑drained soil',
    growth:'70–100 days from seed to flower',
    facts:['Sunflowers can follow the sun.','Center has tiny florets.','Tall stem, broad leaves.'],
    sitePath:'/?plant=sunflower'
  },
  rose:{
    name:'Rose', emoji:'🌹',
    desc:'Woody shrub with layered, often fragrant petals and protective thorns. Leaves are pinnate with toothed edges; thousands of cultivated varieties exist.',
    habitat:'Gardens and hedges; fertile, well‑drained soil',
    growth:'Blooms spring to fall (variety‑dependent)',
    facts:['Layered petals.','Thorns protect the stem.','Leaves with toothed edges.'],
    sitePath:'/?plant=rose'
  },
  lily:{
    name:'Lily', emoji:'🌸',
    desc:'Showy trumpet or bowl‑shaped flowers with six tepals and prominent pollen‑laden stamens. Grows from bulbs; many are sweetly fragrant.',
    habitat:'Meadows and gardens; moist, well‑drained soil',
    growth:'Bulb to bloom in late spring/summer',
    facts:['Six big petals, long stamens.','Narrow leaves.','Grows from bulbs.'],
    sitePath:'/?plant=lily'
  },
  tulip:{
    name:'Tulip', emoji:'🌷',
    desc:'Cup‑shaped bloom on a smooth stem, emerging early in spring. Colors span solids to striking bicolors and fringed forms.',
    habitat:'Cool winters, bright springs; well‑drained soil',
    growth:'Planted in fall; blooms in spring',
    facts:['Cup-shaped bloom.','Smooth leaves.','Bulb plant.'],
    sitePath:'/?plant=tulip'
  },
  daisy:{
    name:'Daisy', emoji:'🌼',
    desc:'Cheerful composite bloom with a yellow central disk and white rays. Opens with daylight and attracts many pollinators.',
    habitat:'Lawns and meadows; average soils, sun',
    growth:'Fast‑growing; blooms spring through summer',
    facts:['Yellow center + white petals.','Opens in daylight.','Low stems.'],
    sitePath:'/?plant=daisy'
  },
  dandelion:{
    name:'Dandelion', emoji:'🌼',
    desc:'Common lawn wildflower with a rosette of toothed leaves. Yellow flowers mature into a puffball of parachute seeds that ride the wind.',
    habitat:'Lawns, sidewalks, disturbed soils',
    growth:'Rapid; multiple flushes a season',
    facts:['Turns into puffball seeds.','Toothed leaf rosette.','Seeds ride the wind.'],
    sitePath:'/?plant=dandelion'
  },
  marigold:{
    name:'Marigold', emoji:'🌼',
    desc:'Ruffled blooms from golden yellow to deep orange with a distinct scent. Popular companion plants that attract helpful insects.',
    habitat:'Full sun; average garden soil',
    growth:'Quick annual; blooms summer to frost',
    facts:['Ruffled orange/yellow blooms.','Strong scent.','Attracts helpers.'],
    sitePath:'/?plant=marigold'
  },
  daffodil:{
    name:'Daffodil', emoji:'🌼',
    desc:'Spring bulbs with a trumpet‑like corona surrounded by six petals. Usually yellow or white; classic harbingers of spring.',
    habitat:'Woodland edges, gardens; well‑drained soil',
    growth:'Planted in fall; blooms very early spring',
    facts:['Trumpet center.','Yellow/white petals.','Early spring bloom.'],
    sitePath:'/?plant=daffodil'
  },
  orchid:{
    name:'Orchid', emoji:'🪷',
    desc:'Diverse family known for a specialized lip petal (labellum). Many species are epiphytes that grow on trees in warm, humid air.',
    habitat:'Tropics; humid, airy roots; indirect light',
    growth:'Slow to moderate; episodic blooms',
    facts:['Special petal “labellum”.','Many grow on trees.','Like warm, humid air.'],
    sitePath:'/?plant=orchid'
  },
  hibiscus:{
    name:'Hibiscus', emoji:'🌺',
    desc:'Large, papery petals in vivid colors and a long, showy staminal column. Loves heat and sunshine; some species make tart herbal teas.',
    habitat:'Warm climates; rich, consistently moist soil',
    growth:'Fast in summer; blooms repeatedly',
    facts:['Huge colorful petals.','Long pollen tube.','Loves sunshine.'],
    sitePath:'/?plant=hibiscus'
  },
};

// Map model labels -> our keys
const LABEL_MAP = [
  { match:['sunflower','helianthus'], key:'sunflower' },
  { match:['rose','rosa'], key:'rose' },
  { match:['lily','lilium'], key:'lily' },
  { match:['tulip','tulipa'], key:'tulip' },
  { match:['daisy','bellis'], key:'daisy' },
  { match:['dandelion','taraxacum'], key:'dandelion' },
  { match:['marigold','tagetes','calendula'], key:'marigold' },
  { match:['daffodil','narcissus'], key:'daffodil' },
  { match:['orchid','orchidaceae'], key:'orchid' },
  { match:['hibiscus'], key:'hibiscus' },
];

const hasRealToken = (t) => t && !/PASTE_YOUR/i.test(t);

// nicer voice
async function chooseNiceVoice() {
  try {
    const vs = await Speech.getAvailableVoicesAsync();
    if (!vs?.length) return undefined;
    const pref = [
      'com.apple.ttsbundle.Samantha-compact',
      'com.apple.ttsbundle.Moira-compact',
      'en-us-x-sfg#female_1-local',
      'en-gb-x-rjs#female_2-local',
    ];
    for (const id of pref) { const v = vs.find(x => x.identifier === id); if (v) return v.identifier; }
    const en = vs.find(v => (v.language||'').toLowerCase().startsWith('en'));
    return en?.identifier;
  } catch { return undefined; }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// HF call with retries (handles 503 warmup)
async function classifyFlowerBase64(base64) {
  if (!hasRealToken(HF_TOKEN)) throw new Error('NO_TOKEN');

  const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  const blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      body: blob,
    });

    if (res.status === 503) {
      // model warming up
      console.log('HF 503: model loading… retrying');
      await sleep(1800);
      continue;
    }
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      console.log('HF error', res.status, txt);
      lastErr = new Error(`HF_${res.status}`);
      break;
    }
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('BAD_RESPONSE');
    return data; // [{label, score}, ...]
  }
  throw lastErr || new Error('HF_UNKNOWN');
}

function mapLabelToKey(label) {
  const L = (label||'').toLowerCase();
  for (const r of LABEL_MAP) if (r.match.some(m => L.includes(m))) return r.key;
  return null;
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [voiceId, setVoiceId] = useState();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');      // status hint under button
  const [plantKey, setPlantKey] = useState(null);
  const [showWeb, setShowWeb] = useState(false);

  const Cam = CameraView ?? Camera;
  const cameraRef = useRef(null);

  useEffect(() => { chooseNiceVoice().then(setVoiceId); }, []);

  const speak = (text) => {
    Speech.stop();
    Speech.speak(text, { voice: voiceId, rate: Platform.OS === 'ios' ? 0.5 : 0.9, pitch: 1.05, volume: 1.0 });
  };

  if (!permission) {
    return (<View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /><Text style={styles.body}>Getting ready…</Text></View>);
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera Needed</Text>
        <Text style={[styles.body,{marginVertical:10}]}>We use the camera to scan flowers.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.bigButton}><Text style={styles.bigButtonText}>Grant Permission</Text></TouchableOpacity>
      </View>
    );
  }

  const camProps = CameraView ? { facing:'back' } : { type: Camera?.Constants?.Type?.back ?? 'back', ratio: '16:9' };

  const onScan = async () => {
    if (busy) return;
    setBusy(true);
    setHint('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speak('Scanning…');

    try {
      const photo = cameraRef.current?.takePictureAsync
        ? await cameraRef.current.takePictureAsync({ base64:true, skipProcessing:true, quality:0.9 })
        : null;

      if (!photo?.base64) throw new Error('NO_IMAGE');

      let preds = null;
      try {
        preds = await classifyFlowerBase64(photo.base64);
      } catch (e) {
        // Friendly fallbacks
        if (String(e.message).includes('NO_TOKEN')) {
          console.log('Missing Hugging Face token. Using chooser fallback.');
          setHint('No cloud key configured — choose a flower below.');
        } else if (String(e.message).startsWith('HF_401') || String(e.message).startsWith('HF_403')) {
          setHint('Token invalid/forbidden — choose a flower below.');
        } else if (String(e.message).startsWith('HF_429')) {
          setHint('Rate limited — try again in a moment.');
        } else {
          setHint('Could not reach the recognition service.');
        }
      }

      let chosen = null;
      if (preds) {
        // Highest score first
        preds.sort((a,b) => (b.score || 0) - (a.score || 0));
        console.log('HF preds top5:', preds.slice(0,5));
        // Prefer a mapped class with reasonable confidence
        for (const p of preds) {
          const key = mapLabelToKey(p.label);
          if (key && (p.score ?? 0) >= 0.25) { chosen = key; break; }
        }
        // Fallback: take first mapped class even if low confidence
        if (!chosen) {
          for (const p of preds) { const key = mapLabelToKey(p.label); if (key) { chosen = key; break; } }
        }
      }

      if (!chosen) {
        // Show chooser; don’t block the kid with an alert
        setPlantKey('sunflower');
        speak('I am not sure. Pick the closest flower below.');
      } else {
        setPlantKey(chosen);
        const plant = PLANTS[chosen];
        speak(`${plant.name}. ${plant.desc}`);
        setShowWeb(true);
      }
    } catch (e) {
      console.log('scan error', e);
      setHint('Something went wrong — choose a flower below.');
      setPlantKey('sunflower');
    } finally {
      setBusy(false);
    }
  };

  const plant = plantKey ? PLANTS[plantKey] : null;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={{uri:'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1600&auto=format&fit=crop'}} style={{flex:1}} resizeMode="cover" blurRadius={10}>
        <View style={styles.overlay}>
          <Text style={styles.header}>🌿 PlantAR</Text>
          <Text style={styles.subtitle}>Point at a flower and tap Scan.</Text>

          <View style={styles.cameraWrap}>
            <Cam ref={cameraRef} style={{flex:1}} {...camProps} />
            <View style={styles.reticle} pointerEvents="none" />
          </View>

          {/* Big sticky bottom button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={onScan} disabled={busy} activeOpacity={0.9} style={[styles.bigButton, busy && {opacity:0.8}]}> 
              {busy ? <ActivityIndicator color="#06210C" /> : <Text style={styles.bigButtonText}>📸  Scan Flower</Text>}
            </TouchableOpacity>
            {!!hint && <Text style={styles.hint}>{hint}</Text>}
          </View>

          {plant && (
            <View style={[styles.card,{marginTop:16}]}> 
              <Text style={styles.title}>{plant.emoji} {plant.name}</Text>
              <Text style={[styles.body,{marginTop:8}]}>
                {plant.desc}{'\n'}
                Habitat: {plant.habitat}{'\n'}
                Growth: {plant.growth}
              </Text>

              <View style={{flexDirection:'row',gap:10,marginTop:14,flexWrap:'wrap'}}>
                <TouchableOpacity onPress={()=>speak(`${plant.name}. ${plant.desc}`)} style={styles.btnAlt}><Text style={styles.btnAltText}>🔊 Listen</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=>setShowWeb(true)} style={styles.btnAlt}><Text style={styles.btnAltText}>🧩 Learn Parts (3D)</Text></TouchableOpacity>
              </View>

              {/* Quick facts as chips */}
              <View style={{flexDirection:'row',gap:8,marginTop:12,flexWrap:'wrap'}}>
                {plant.facts.map((f,i)=> (
                  <View key={i} style={[styles.chip]}>
                    <Text style={styles.chipText}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* Let kids switch if recognition guessed wrong */}
              <View style={{flexDirection:'row',gap:8,marginTop:12,flexWrap:'wrap'}}>
                {Object.keys(PLANTS).map(k=> (
                  <Pressable key={k} onPress={()=>{setPlantKey(k); const p = PLANTS[k]; speak(`${p.name}. ${p.desc}`);}} style={[styles.chip, plantKey===k && styles.chipActive]}>
                    <Text style={[styles.chipText, plantKey===k && {color:'#06210C'}]}>{PLANTS[k].emoji} {PLANTS[k].name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 3D viewer modal */}
        <Modal visible={showWeb} animationType="slide" onRequestClose={()=>setShowWeb(false)}>
          <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
            <View style={{flexDirection:'row',padding:12,gap:8,alignItems:'center'}}>
              <TouchableOpacity onPress={()=>setShowWeb(false)} style={[styles.btnAlt,{paddingVertical:8,paddingHorizontal:12}]}> 
                <Text style={styles.btnAltText}>Close</Text>
              </TouchableOpacity>
              <Text style={{fontSize:20,fontWeight:'800'}}>PlantAR Explorer</Text>
            </View>
            <View style={{flex:1}}>
              <WebView startInLoadingState source={{ uri:`https://plantar-3d.vercel.app${plant?.sitePath ?? '/'}` }} style={{flex:1}} />
              {plant && (
                <View style={styles.infoOverlay} pointerEvents="box-none">
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{plant.emoji} {plant.name}</Text>
                    <Text style={styles.infoText}>{plant.desc}</Text>
                    <Text style={styles.infoMeta}><Text style={{fontWeight:'800'}}>Habitat: </Text>{plant.habitat}</Text>
                    <Text style={styles.infoMeta}><Text style={{fontWeight:'800'}}>Growth: </Text>{plant.growth}</Text>
                  </View>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

// ---- Styles
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:theme.bg},
  overlay:{flex:1,backgroundColor:'rgba(11,16,33,0.55)',padding:18,alignItems:'center'},
  header:{fontSize:44,fontWeight:'900',color:theme.accent,marginTop:6},
  subtitle:{fontSize:22,color:theme.text,marginTop:6,marginBottom:10,textAlign:'center'},
  body:{fontSize:18,color:theme.text,lineHeight:24},
  title:{fontSize:26,color:theme.text,fontWeight:'800'},

  cameraWrap:{width:'100%',aspectRatio:9/16,borderRadius:18,overflow:'hidden',borderWidth:3,borderColor:theme.accent,backgroundColor:'#000',marginVertical:14},
  reticle:{position:'absolute',top:'28%',left:'12%',width:'76%',height:'44%',borderRadius:16,borderWidth:4,borderColor:theme.highlight},

  bottomBar:{position:'absolute',left:18,right:18,bottom:18,alignItems:'center',gap:6},
  bigButton:{backgroundColor:theme.accent,paddingVertical:18,paddingHorizontal:24,borderRadius:18,width:'100%',alignItems:'center',
             shadowColor:'#000',shadowOpacity:0.35,shadowRadius:10,shadowOffset:{width:0,height:8},elevation:6},
  bigButtonText:{color:'#06210C',fontSize:22,fontWeight:'900'},
  hint:{color:theme.textDim,fontSize:14,marginTop:4,textAlign:'center'},

  card:{width:'100%',backgroundColor:theme.card,borderColor:'#1F2746',borderWidth:1,borderRadius:16,padding:14,marginBottom:84},
  chip:{backgroundColor:'#0E1533',borderColor:'#273058',borderWidth:1,paddingHorizontal:12,paddingVertical:10,borderRadius:999},
  chipActive:{backgroundColor:theme.accent,borderColor:theme.accent},
  chipText:{color:theme.text,fontWeight:'800',fontSize:16},

  btnAlt:{backgroundColor:'#22305f',paddingVertical:12,paddingHorizontal:16,borderRadius:12},
  btnAltText:{color:theme.text,fontWeight:'800',fontSize:16},

  // overlay styles for Explorer
  infoOverlay:{position:'absolute',left:0,right:0,bottom:0,padding:12},
  infoCard:{backgroundColor:'rgba(255,255,255,0.94)',borderRadius:16,padding:14,shadowColor:'#000',shadowOpacity:0.2,shadowRadius:10,shadowOffset:{width:0,height:6},elevation:6},
  infoTitle:{fontSize:18,fontWeight:'900',marginBottom:6,color:'#0B1021'},
  infoText:{fontSize:14,lineHeight:20,color:'#0B1021'},
  infoMeta:{fontSize:13,color:'#0B1021'},
});
