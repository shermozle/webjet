"""Build the 23-event TurboDemo mapping. Legacy template page events stay synthetic-only."""
import csv,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]; OUT=ROOT/'data';OUT.mkdir(exist_ok=True)
header=['Old Event Name','New Event Name','Old Event Property Name','New Event Property Name','Old Event Property Values','New Event Property Values','Old Event Property Values Distribution','New Event Property Values Distribution','Old User Property','New User Property','Old User Property Values','New User Property Values','Old User Property Values Distribution','New User Property Values Distribution','Old Group Type','New Group Type','Old Group Property','New Group Property','Old Group Property Values','New Group Property Values','Old Group Property Values Distribution','New Group Property Values Distribution']
pairs=[('Create Account','Destination Selected'),('Add Integrations','Flight Search Submitted'),('Create Opportunity','Flight Filter Applied'),('Follow Opportunity','Flight Selected'),('View Campaign','Checkout Started'),('Add Report','Traveller Details Submitted'),('Request Premium Subscription','Payment Submitted'),('Renew Subscription','Booking Completed'),('View Home Page','View Home Page'),('Contact Sales','Trip Saved'),('Request Demo','Account Signed In'),('Sign Up Free Trial','Hotel Selected'),('Complete Free Trial','Package Selected'),('View Pop-up Window','Banner Clicked'),('Close Pop-up Window','Destination Filter Applied'),('Custom Event 1','Travel Extra Updated'),('Custom Event 2','Flight Sort Changed'),('Custom Event 3','Payment Failed'),('Receive Account Alert','Fare Alert Created'),('View Account Alert','Support Article Opened'),('Page View','Page View'),('Daily Ad Metric','Daily Ad Metrics'),('Lead Form Completed','Lead Form Completed')]
# This uses the failure-tested turbodemo/references/template-spec.md variant, not
# the incompatible 51-row/17-group-property template in turbodemo-taxonomy.
props={
 'Object Type':('destination','CRM; Marketing Ops; Ticketing','Melbourne (MEL); Gold Coast (OOL); Bali (DPS)','0.4; 0.35; 0.25'),
 'Product Line':('product_type','Enterprise; Professional; Starter','Flights; Hotels; Packages','0.8; 0.12; 0.08'),
 'Notification Type':('notification_type','In-app; Email; Push; SMS','Fare alert; Landing offer; Booking help; Payment issue','0.35; 0.3; 0.2; 0.15'),
 'Custom Event Property 1':('extra_type','Value A; Value B; Value C','baggage; seat; flex','0.5; 0.3; 0.2'),
 'Custom Event Property 2':('action','Value X; Value Y; Value Z','added; removed','0.85; 0.15'),
 'Custom Event Property 3':('sort_by','Value A; Value B; Value C','Recommended; Lowest price; Earliest departure','0.4; 0.45; 0.15'),
 'Custom Event Property 4':('airline','Value X; Value Y; Value Z','Jetstar; Virgin Australia; Qantas','0.45; 0.3; 0.25'),
 'Custom Event Property 5':('trip_type','Value A; Value B; Value C','Return; One way','0.65; 0.35'),
 'Custom Event Property 6':('travellers','Value X; Value Y; Value Z','1; 2; 4','0.45; 0.35; 0.2'),
 'Page Title':('Page Title','home page; log in page; sign up page; upgrade page; help page; others','Flights & travel deals; Your trips; Choose your flights; Complete your booking; Help; Other','0.4; 0.1; 0.2; 0.15; 0.1; 0.05'),
 'Page URL':('Page URL','amplitude.com/home; amplitude.com/login; others','webjet.com.au/home; webjet.com.au/login; other','0.6; 0.3; 0.1'),
 'Page Path':('Page Path','/home; /login; /','/home; /login; /','0.6; 0.3; 0.1'),
 'ad_group_id':('ad_group_id','6320759775352; 6319411029952; 6316479011352; 6313096363952; 6322597376152','6320759775352; 6319411029952; 6316479011352; 6313096363952; 6322597376152','0.25; 0.25; 0.25; 0.125; 0.125'),
 'ad_metrics.clicks':('ad_metrics.clicks','0; 1; 2; 3; 4','0; 1; 2; 3; 4','0.25; 0.23; 0.23; 0.2; 0.09'),
 'ad_metrics.costs':('ad_metrics.costs','250; 748.67; 1600; 1234; 633','250; 748.67; 1600; 1234; 633','0.25; 0.125; 0.125; 0.25; 0.25'),
 'ad_metrics.impressions':('ad_metrics.impressions','6; 339; 3; 18; 5','6; 339; 3; 18; 5','0.2; 0.3; 0.2; 0.1; 0.2'),
 'ad_name':('ad_name','Product Metrics; Starter Plan; Demo; Dummies Guide','Your next adventure; Weekend escape; Bali flight deals; Family holidays','0.3; 0.25; 0.25; 0.2'),
 'campaign_name':('campaign_name','AMER - Retargeting - New Leads campaign; FB - Commercial East and Central - Q1 2023; EMEA - Retargeting - New Leads campaign; AMER - Forrester','Summer escapes; Domestic flight deals; Bali getaways; Family holidays','0.3; 0.3; 0.25; 0.15')}
rows=[]
for i,(old,new) in enumerate(pairs):
 if i in [8,9]: keys=['N/A']
 elif i in [15,16]: keys=['Custom Event Property '+str(n) for n in range(1,7)]
 elif i in [13,14,17,18,19]:keys=['Notification Type','Product Line']
 elif i==20:keys=['Page Title','Page URL','Page Path']
 elif i==21:keys=['ad_group_id','ad_metrics.clicks','ad_metrics.costs','ad_metrics.impressions','ad_name','campaign_name']
 elif i==22:keys=['campaign_name']
 else:keys=['Object Type','Product Line']
 for j,key in enumerate(keys):
  r=['']*22
  if j==0:r[:2]=[old,new]
  if key=='N/A':r[2:8]=['N/A']*6
  else:
   name,oldvals,vals,dist=props[key];oldcount=len(oldvals.split(';'));oldDist='; '.join(str(round(1/oldcount,3)) for _ in range(oldcount))
   r[2:8]=[key,name,oldvals,vals,oldDist,dist]
  rows.append(r)
users=[('Age','Age','18-24; 25-34; 35-44; 45-54; 55-64; 65+','0.12; 0.25; 0.23; 0.18; 0.14; 0.08'),('Gender','Gender','Male; Female; Non-binary; Prefer not to say','0.48; 0.46; 0.03; 0.03'),('Contract Type','member_status','Guest; Member','0.65; 0.35'),('User Type','traveller_type','New visitor; Family planner; Frequent flyer; Deal seeker','0.35; 0.25; 0.15; 0.25'),('User Start Date','first_visit_month','2026-09; 2026-10; 2026-11','0.3; 0.3; 0.4'),('Annual Income','travel_budget','Budget; Mid-range; Premium','0.4; 0.45; 0.15'),('Trial Users','visitor_status','New; Returning','0.55; 0.45'),('utm_campaign','utm_campaign','Summer escapes; Domestic flight deals; Bali getaways; Family holidays','0.3; 0.3; 0.25; 0.15'),('utm_source','utm_source','google; facebook; direct; email','0.4; 0.2; 0.25; 0.15'),('utm_medium','utm_medium','cpc; organic; social; email','0.4; 0.3; 0.15; 0.15'),('utm_term','utm_term','cheap flights; flights to Bali; Webjet','0.4; 0.3; 0.3'),('utm_content','utm_content','hero_banner; destination_card; newsletter','0.6; 0.25; 0.15'),('A/B Testing','A/B Testing','Control; Treatment A; Treatment B','0.34; 0.33; 0.33'),('Custom User Property 1','home_airport','Sydney (SYD); Melbourne (MEL); Brisbane (BNE)','0.45; 0.35; 0.2'),('Custom User Property 2','preferred_destination','Melbourne (MEL); Gold Coast (OOL); Bali (DPS)','0.4; 0.35; 0.25'),('Custom User Property 3','booking_count','0; 1; 3','0.55; 0.3; 0.15')]
oldusers={'Contract Type':'Monthly; Annual; Multi-Year','User Type':'Admin; Power User; Regular; Viewer','User Start Date':'01-01-2023; 04-01-2023; 07-01-2023; 10-01-2023; 01-01-2024','Annual Income':'$30000; $50000; $75000; $100000; $150000','Trial Users':'Trial; Non-Trial','Custom User Property 1':'Value 1; Value 2; Value 3','Custom User Property 2':'Value A; Value B; Value C','Custom User Property 3':'Value X; Value Y; Value Z'}
for i,(old,new,vals,dist) in enumerate(users):
 ov=oldusers.get(old,vals);n=len(ov.split(';'));od='; '.join(str(round(1/n,3)) for _ in range(n));rows[i][8:14]=[old,new,ov,vals,od,dist]
groups=[('Organization Name (Account)','travel_party','Solo; Couple; Family; Friends','0.3; 0.35; 0.25; 0.1'),('Number of Employees','party_size','1; 2; 4','0.3; 0.45; 0.25'),('Industry Vertical (Account)','trip_purpose','Leisure; Business; Visiting family','0.65; 0.15; 0.2'),('Total ARR','annual_travel_spend','1000; 3000; 8000','0.3; 0.5; 0.2'),('Account Manager','booking_channel','Web; App; Agent','0.6; 0.3; 0.1')]
rows[0][14:16]=['Org Id','travel_party_id']
for i,(old,new,vals,dist) in enumerate(groups):rows[i][16:22]=[old,new,vals,vals,dist,dist]
path=OUT/'webjet-taxonomy.csv'
with path.open('w',newline='') as f:w=csv.writer(f);w.writerow(header);w.writerows(rows)
# Four-column patterns: quote the event pair in the first column. A second
# explicit five-column representation is supplied for UIs with From/To fields.
patterns=[('Create Account','Add Integrations','70%','Custom Event 1','Strong Positive'),('Follow Opportunity','View Campaign','48%','Custom Event 1','Medium Positive'),('View Campaign','Renew Subscription','38%','Contact Sales','Strong Positive'),('Sign Up Free Trial','Complete Free Trial','32%','View Pop-up Window','Medium Positive'),('Add Integrations','Follow Opportunity','52%','Create Opportunity','Strong Positive'),('Request Premium Subscription','Renew Subscription','92%','View Account Alert','Medium Positive')]
with (OUT/'webjet-data-patterns.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['Events with higher dropoff and a conversion driver','Conversion Rate','Conversion Driver','Correlation']);w.writerows([['%s,%s'%(a,b),c,d,e] for a,b,c,d,e in patterns])
with (OUT/'webjet-data-patterns-expanded.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['From Event','To Event','Conversion Rate','Conversion Driver','Correlation']);w.writerows(patterns)
# Derive every mapping from the saved CSV.
with path.open() as f:parsed=list(csv.reader(f))[1:]
m={k:{} for k in ['eventNamesMapping','eventPropertiesMapping','eventPropertiesByEventMapping','groupTypesMapping','groupPropertiesMapping','userPropertiesMapping']};event=None
for r in parsed:
 if r[0]:event=r[0];m['eventNamesMapping'][event]=r[1]
 for old,new,val,dist,section in [(2,3,5,7,'eventPropertiesMapping'),(8,9,11,13,'userPropertiesMapping'),(16,17,19,21,'groupPropertiesMapping')]:
  if r[old] and r[old]!='N/A':
   obj={'name':r[new],'possibleValues':[x.strip() for x in r[val].split(';')],'distribution':[float(x) for x in r[dist].split(';')]};m[section][r[old]]=obj
   if old==2:m['eventPropertiesByEventMapping'].setdefault(event,{})[r[old]]=obj
 if r[14]:m['groupTypesMapping'][r[14]]=r[15]
(OUT/'webjet-mapping.json').write_text(json.dumps(m,indent=2)+'\n')
# Strict validations; fail generation if a template constraint is violated.
assert len(m['eventNamesMapping'])==23
assert len(m['userPropertiesMapping'])==16 and len(m['groupPropertiesMapping'])==5
for r in parsed:
 assert len(r)==22
 for v,d in [(5,7),(11,13),(19,21)]:
  if r[v] and r[v]!='N/A':
   ds=[float(x) for x in r[d].split(';')];assert len(r[v].split(';'))==len(ds);assert abs(sum(ds)-1)<.005
   assert all(len(x.strip().split('.')[-1])<=3 for x in r[d].split(';'))
 if r[3] and r[3]!='N/A':assert r[5] and r[7]
 if r[0] in ['View Home Page','Contact Sales']:assert r[2:8]==['N/A']*6
for event,ps in m['eventPropertiesByEventMapping'].items():
 for key,obj in ps.items():assert obj==m['eventPropertiesMapping'][key]
assert len(patterns)==6
assert all(a in m['eventNamesMapping'] and b in m['eventNamesMapping'] and d in m['eventNamesMapping'] for a,b,c,d,e in patterns)
with (OUT/'webjet-data-patterns.csv').open() as f:assert all(len(r)==4 for r in csv.reader(f))
print('PASS: 23 events, 16 user properties, 5 group properties, 22 columns, 6 patterns; JSON matches CSV.')
