import React from 'react';
import Layout from '@theme/Layout';

function Disclaimer() {
    return (
        <Layout title="Disclaimer">
            
            <div style={{paddingTop:'2rem'}} className="container">
                <h1 className="docTitle_node_modules-@docusaurus-theme-classic-src-theme-DocItem-">Disclaimer</h1>
                <p>Nodejs Web Scraper uses <a title="ISC" href="https://opensource.org/licenses/ISC"> ISC License</a></p>
                {/* <br/> */}
                <p>The author doesn't condone the usage of the program or a part of it, for any illegal activity, and will not be held responsible for actions taken by the user. 
                    Please use it with discretion, and in accordance with international/your local law.  </p>

            </div>
        </Layout>
    );
}

export default Disclaimer;