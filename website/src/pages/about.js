import React from 'react';
import Layout from '@theme/Layout';

function About() {
    return (
        <Layout title="About">
            {/* <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          fontSize: '20px',
        }}>
            <h1>About</h1>
            <br/>
        <p>
            
          Edit <code>pages/hello.js</code> and save to reload.
        </p>
      </div> */}
            <div style={{paddingTop:'2rem'}} className="container">
                <h1 className="docTitle_node_modules-@docusaurus-theme-classic-src-theme-DocItem-">About</h1>
                <p>Nodejs Web Scraper was created in 2018 out of a need to abstract and simplify the common tasks a web programmer faces,
                When scraping data from Websites. I thought to my self: "Why not create some reusable code,
                that can be easily configured, instead of re-writing the same site-specific code, each time for a different task?"
                
                <p>Currently the program doesn't support any SPA functionality, But i'm planing on changing that in the future.</p>

                <p>For any questions suggestions or feedback, please don't hesitate to contact me by email: <a title="email" href = "mailto:i.brod83@hotmail.com">i.brod83@hotmail.com</a>
                <p>You can also leave an issue in Github: <a title="Github" href="https://github.com/ibrod83/nodejs-web-scraper/issues">https://github.com/ibrod83/nodejs-web-scraper/issues</a></p>
</p>
          </p>
            </div>
        </Layout>
    );
}

export default About;