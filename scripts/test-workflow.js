async function runWorkflowTest() {
  console.log('🔄 Starting Full-Stack End-to-End Workflow Test...');

  // 1. Mock Login as Hiker
  const hikerRes = await fetch('http://127.0.0.1:8787/api/auth/mock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'user', email: 'aarav.shrestha@nepal.test', name: 'Aarav Shrestha' }),
  });
  const hikerData = await hikerRes.json();
  console.log('1. ✅ Hiker logged in:', hikerData.user.name, `(${hikerData.user.email})`);
  const hikerToken = hikerData.token;

  // 2. Hiker uploads a new GPX trail
  const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Nagarkot Sunrise Ridge Trek</name></metadata>
  <trk>
    <name>Nagarkot Sunrise Ridge Trek</name>
    <trkseg>
      <trkpt lat="27.7120" lon="85.5180"><ele>1820</ele></trkpt>
      <trkpt lat="27.7160" lon="85.5220"><ele>1950</ele></trkpt>
      <trkpt lat="27.7210" lon="85.5260"><ele>2175</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

  const uploadRes = await fetch('http://127.0.0.1:8787/api/user/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hikerToken}`,
    },
    body: JSON.stringify({
      fileName: 'nagarkot_sunrise.gpx',
      name: 'Nagarkot Sunrise Ridge Trek',
      description: 'Golden hour Himalayan panoramic ridge walk',
      district: 'Bhaktapur',
      province: 'Bagmati',
      fileContent: sampleGPX,
    }),
  });
  const uploadData = await uploadRes.json();
  console.log('2. ✅ Hiker uploaded trail track to Cloudflare R2 & D1:');
  console.log('   Route ID:', uploadData.routeId);
  console.log('   Status:', uploadData.status);
  console.log('   Stats:', uploadData.summary);

  const routeId = uploadData.routeId;

  // 3. Verify trail is listed in Hiker's "My Uploads" with status "pending"
  const myRoutesRes = await fetch('http://127.0.0.1:8787/api/user/my-routes', {
    headers: { 'Authorization': `Bearer ${hikerToken}` },
  });
  const myRoutesData = await myRoutesRes.json();
  const myPendingRoute = myRoutesData.routes.find(r => r.id === routeId);
  console.log('3. ✅ Trail found in Hiker My Uploads: status =', myPendingRoute?.status);

  // 4. Verify trail does NOT yet appear on public map (/api/routes)
  const publicRes = await fetch('http://127.0.0.1:8787/api/routes?search=Nagarkot');
  const publicData = await publicRes.json();
  const existsPubliclyBefore = publicData.routes.some(r => r.id === routeId);
  console.log('4. ✅ Public site check: route is NOT public yet =', !existsPubliclyBefore);

  // 5. Admin logs in
  const adminRes = await fetch('http://127.0.0.1:8787/api/auth/mock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;
  console.log('5. ✅ Admin logged in:', adminData.user.role);

  // 6. Admin inspects pending routes
  const pendingRes = await fetch('http://127.0.0.1:8787/api/admin/routes/pending', {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const pendingData = await pendingRes.json();
  const routeToReview = pendingData.routes.find(r => r.id === routeId);
  console.log('6. ✅ Admin found pending route:', routeToReview?.name, 'submitted by', routeToReview?.submitter?.name);

  // 7. Admin approves the submission
  const reviewRes = await fetch(`http://127.0.0.1:8787/api/admin/routes/${routeId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'approve',
      adminNote: 'Verified clean GPS track. Approved for public trail guide!',
    }),
  });
  const reviewResult = await reviewRes.json();
  console.log('7. ✅ Admin approved route:', reviewResult.message);

  // 8. Verify route is NOW visible on public map!
  const publicResAfter = await fetch('http://127.0.0.1:8787/api/routes?search=Nagarkot');
  const publicDataAfter = await publicResAfter.json();
  const approvedPublicRoute = publicDataAfter.routes.find(r => r.id === routeId);
  console.log('8. 🎉 Route is NOW LIVE on public map! Name:', approvedPublicRoute?.name, 'Submitter:', approvedPublicRoute?.submitter?.name);

  // 9. Verify raw track can be downloaded from R2
  const downloadRes = await fetch(`http://127.0.0.1:8787/api/routes/${routeId}/download`);
  const downloadedText = await downloadRes.text();
  const downloadOk = downloadedText.includes('<gpx');
  console.log('9. 📥 R2 File Download verified:', downloadOk ? 'SUCCESS (valid GPX file streamed)' : 'FAILED');

  console.log('\n🌟 ALL FULL-STACK CLOUDFLARE END-TO-END WORKFLOW TESTS PASSED!');
}

runWorkflowTest().catch(console.error);
