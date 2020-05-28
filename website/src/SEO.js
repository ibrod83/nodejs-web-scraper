import React from 'react'
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';



const SEO = (props) => {
    const context = useDocusaurusContext();
    const { siteConfig = {} } = context;
    console.log('config',siteConfig)
    return (
        <Head>
             
            <meta property="og:image" content={`${siteConfig.url}/img/favicon.ico`} />
            {/* <meta property="og:url" content={`${siteConfig.url}`} /> */}


            {/* <meta property="og:yoyo" content="Yooo!!!" />      */}
            {/* <meta property="og:description" content="My custom description" /> */}
            {/* <meta charSet="utf-8" /> */}
            {/* <title>My Title</title> */}
            {/* <link rel="canonical" href="http://mysite.com/example" /> */}
        </Head>
    )



};

export default SEO;