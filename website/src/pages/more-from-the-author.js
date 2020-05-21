import React from 'react';
import Layout from '@theme/Layout';

function More() {
    return (
        <Layout title="More">
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
                <h1 className="docTitle_node_modules-@docusaurus-theme-classic-src-theme-DocItem-">More from the author</h1>
                <p>If you like tools that simplify the work with Node, you might want to check these out:</p>

                <p><a href="https://www.npmjs.com/package/nodejs-file-downloader">nodejs-file-downloader</a></p>
                <p><a href="https://socketio-playground.ibrod83.com/">Socket.IO Playground</a></p>
            </div>
        </Layout>
    );
}

export default More;