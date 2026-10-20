import {getCliClient} from 'sanity/cli'
// One-off: set the placeholder FX rate used by the website's cross-currency price filters.
getCliClient({apiVersion: '2026-02-01'}).patch('siteSettings').set({usdToMxn: 18.5}).commit().then(() => console.log('usdToMxn set'))
