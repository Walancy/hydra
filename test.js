const STEAMGRID_API_KEY = '8c53a8c366b96459117a44a68a5d7a60';
async function run() {
  const t = encodeURIComponent('The Elder Scrolls IV: Oblivion Remastered');
  const res = await fetch('https://www.steamgriddb.com/api/v2/search/autocomplete/'+t, {
    headers: { Authorization: `Bearer ${STEAMGRID_API_KEY}` }
  });
  const data = await res.json();
  console.log('Search:', JSON.stringify(data, null, 2));
  if (data.data && data.data.length > 0) {
    const cid = data.data[0].id;
    const gres = await fetch('https://www.steamgriddb.com/api/v2/grids/game/'+cid, {
      headers: { Authorization: `Bearer ${STEAMGRID_API_KEY}` }
    });
    const gdata = await gres.json();
    console.log('Grids:', JSON.stringify(gdata.data.slice(0,3), null, 2));
  }
}
run();
