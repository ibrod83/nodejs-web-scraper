import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import { FaBeer, FaDownload, FaSitemap, FaNetworkWired, FaExclamationTriangle, FaStream, FaDatabase } from 'react-icons/fa';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';
import SEO from '../SEO'
import Head from '@docusaurus/Head';

// const sizedIcon = (Icon)=>{
//   console.log('icon',Icon)
//   debugger;
//   return ()=>{
//     return  <Icon {...Icon.props} size={iconSize}/>
//   }
//   // return 
// }
const iconColor = 'black';
const iconSize = 80;
const features = [
  {
    title: <>Recursive scraping</>,
    icon: <FaSitemap color={iconColor} size={iconSize} />,
    imageUrl: 'img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        Scrape/crawl deeply nested server-side rendered websites
      </>
    ),
  },
  {
    title: <>Data collection</>,
    icon: <FaDatabase color={iconColor} size={iconSize} />,
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Hook into various steps of the scraping/crawling tree and collect the data.
      </>
    ),
  },
  {
    title: <>File & image downloading</>,
    icon: <FaDownload color={iconColor} size={iconSize} />,
    imageUrl: 'img/undraw_docusaurus_tree.svg',
    description: (
      <>
        Download files & images, without dealing with streams, paths, content-type and duplicate file names.
      </>
    ),
  },
  {
    title: <>Pagination</>,
    icon: <FaNetworkWired color={iconColor} size={iconSize} />,
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Simple api for setting up scraping jobs for paginated webpages.
      </>
    ),
  },

  {
    title: <>Automatic error handling</>,
    icon: <FaExclamationTriangle color={iconColor} size={iconSize} />,
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        The program automatically retries failed network requests.
      </>
    ),
  },
  {
    title: <>Concurrency management</>,
    icon: <FaStream color={iconColor} size={iconSize} />,
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Limit the number of concurrent http requests, to avoid having your ip banned by the server.
      </>
    ),
  },


];

function Feature({ imageUrl, title, description, icon }) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={classnames('col col--4', styles.feature)}>
      {imgUrl && (
        <div style={{ marginBottom: '20px' }} className="text--center">
          {/* <img className={styles.featureImage} src={imgUrl} alt={title} /> */}
          {icon}
          {/* <FaBeer size={iconSize} /> */}
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  console.log(siteConfig)
  return (
    // <div>
    // <SEO/>
    <Layout
      title={`Home Page`}
      description="Nodejs Web Scraper - A simplified web scraper/crawler for Nodejs">
      <SEO>

      </SEO>
      <Head>
        <link rel="canonical" href={`${siteConfig.url}`} />
        <meta property="og:url" content={`${siteConfig.url}`} />

      </Head>
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <h2 style={{ fontWeight: 'normal' }} className="hero__subtitle">{siteConfig.tagline}</h2>
          <div className={styles.buttons}>
            <Link
              title="Get started"
              style={{ marginLeft: '10px' }}
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('docs/doc1')}>
              Get started
            </Link>
            {/* <Link
             title="npm"
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              style={{marginLeft:'10px'}}
              to={'https://www.npmjs.com/package/nodejs-web-scraper'}>
              npm
            </Link>
            <Link
             title="github"
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              style={{marginLeft:'10px'}}
              to={'https://github.com/ibrod83/nodejs-web-scraper'}>
              Github
            </Link> */}

          </div>

        </div>
      </header>
      <main>
        {features && features.length && (

          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>


        )}
        {/* <section  className={styles.features}>
          <div className="container">
            <h2 className="text--center">The gist</h2>
            <div className="row">
              <div className="col col--6"><img class="example-image"  src="img/example1.png" alt="example1"/></div>
              <div className="col col--6"> <img class="example-image"  src="img/example2.png" alt="example2"/></div>
              
             
            </div>
          </div>
        </section> */}

      </main>
    </Layout>
    // </div>

  );
}

export default Home;
