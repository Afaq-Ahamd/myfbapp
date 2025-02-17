import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { GraphQLClient, gql } from 'graphql-request';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const endpoint = "http://pro-techs-bloggers.lovestoblog.com/graphql";
  const graphQLClient = new GraphQLClient(endpoint);
  const referringURL = ctx.req.headers?.referer || null;
  const pathArr = ctx.query.postpath as Array<string>;
  
  // Join the path array to form the complete path
  const path = pathArr.join('/');
  console.log('Requested path:', path);  // Log the path to see what is being requested
  
  const fbclid = ctx.query.fbclid;

  // Redirect if Facebook is the referer or request contains fbclid
  if (referringURL?.includes('facebook.com') || fbclid) {
    return {
      redirect: {
        permanent: false,
        destination: `${'http://pro-techs-bloggers.lovestoblog.com/'}${encodeURI(path as string)}`,
      },
    };
  }

  // Log the final URL before making the GraphQL query
  console.log('Requesting data from GraphQL API for path:', path);

  const query = gql`
    {
      post(id: "/${path}/", idType: URI) {
        id
        excerpt
        title
        link
        dateGmt
        modifiedGmt
        content
        author {
          node {
            name
          }
        }
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }
    }
  `;

  try {
    const data = await graphQLClient.request(query);

    // Log the response to see what data is returned from the GraphQL API
    console.log("GraphQL response data:", data);

    if (!data.post) {
      console.log("Post not found for path:", path);  // Log if the post is not found
      return {
        notFound: true,
      };
    }

    return {
      props: {
        path,
        post: data.post,
        host: ctx.req.headers.host,
      },
    };
  } catch (error) {
    console.error("GraphQL API request failed:", error);
    return {
      notFound: true,
    };
  }
};

interface PostProps {
  post: any;
  host: string;
  path: string;
}

const Post: React.FC<PostProps> = (props) => {
  const { post, host, path } = props;

  // Function to remove HTML tags from excerpt
  const removeTags = (str: string) => {
    if (str === null || str === '') return '';
    else str = str.toString();
    return str.replace(/(<([^>]+)>)/gi, '').replace(/\[[^\]]*\]/, '');
  };

  return (
    <>
      <Head>
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={removeTags(post.excerpt)} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content={host.split('.')[0]} />
        <meta property="article:published_time" content={post.dateGmt} />
        <meta property="article:modified_time" content={post.modifiedGmt} />
        <meta property="og:image" content={post.featuredImage.node.sourceUrl} />
        <meta
          property="og:image:alt"
          content={post.featuredImage.node.altText || post.title}
        />
        <title>{post.title}</title>
      </Head>
      <div className="post-container">
        <h1>{post.title}</h1>
        <img
          src={post.featuredImage.node.sourceUrl}
          alt={post.featuredImage.node.altText || post.title}
        />
        <article dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </>
  );
};

export default Post;
