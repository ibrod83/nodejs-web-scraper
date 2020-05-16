import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import { FaBeer,FaDownload,FaSitemap,FaNetworkWired,FaExclamationTriangle,FaStream } from 'react-icons/fa';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';
// const sizedIcon = (Icon)=>{
//   console.log('icon',Icon)
//   debugger;
//   return ()=>{
//     return  <Icon {...Icon.props} size={iconSize}/>
//   }
//   // return 
// }
const iconColor = 'black';
const iconSize= 80;
const features = [
  {
    title: <>Recursive scraping</>,
    icon:<FaSitemap color={iconColor} size={iconSize}/>,
    imageUrl: 'img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        Scrape/crawl deeply nested server-side rendered websites
      </>
    ),
  },
  {
    title: <>Pagination</>,
    icon:<FaNetworkWired color={iconColor} size={iconSize}/>,
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Simple api for paginated webpages.
      </>
    ),
  },
  {
    title: <>Download files</>,
    icon: <FaDownload color={iconColor} size={iconSize}/>,  
    imageUrl: 'img/undraw_docusaurus_tree.svg',
    description: (
      <>
        Download files & images, without dealing with streams, paths and file names.
      </>
    ),
  },
  {
    title: <>Automatic error handling</>,
    icon: <FaExclamationTriangle color={iconColor} size={iconSize}/>,  
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Nodejs Web Scraper automatically retries failed network requests.
      </>
    ),
  },
  {
    title: <>Concurrency management</>,
    icon: <FaStream color={iconColor}  size={iconSize}/>, 
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        Limit the number of concurrent http requests, to avoid having your ip banned by the server.
      </>
    ),
  },
  
];

function Feature({imageUrl, title, description,icon}) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={classnames('col col--4', styles.feature)}>
      {imgUrl && (
        <div style={{marginBottom:'20px'}} className="text--center">
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
  const {siteConfig = {}} = context;
  console.log(siteConfig)
  return (
    <Layout
      title={`Home`}
      description="Nodejs Web Scraper - A simplified web scraper for Nodejs">
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
            style={{marginLeft:'10px'}}
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('docs/doc1')}>
              Documentation
            </Link>
            <Link
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              style={{marginLeft:'10px'}}
              to={'https://www.npmjs.com/package/nodejs-web-scraper'}>
              npm
            </Link>
            <Link
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStarted,
              )}
              style={{marginLeft:'10px'}}
              to={'https://github.com/ibrod83/nodejs-web-scraper'}>
              Github
            </Link>
            
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
      </main>
    </Layout>
  );
}

export default Home;
