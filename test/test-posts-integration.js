'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the expect syntax available throughout
// this module
const expect = chai.expect;

const {Posts} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// used to put randomish documents in db
// so we have data to work with and assert about.
// we use the Faker library to automatically
// generate placeholder values for author, title, content
// and then we insert that data into mongo

function tearDownDb() {
  return new Promise((resolve, reject) => {
    console.warn('Deleting database');
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err));
  });
}

function seedPostsData() {
  console.info('seeding Posts data');
  const seedData = [];
  for (let i = 1; i <= 10; i++) {
    seedData.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    });
  }
// this will return a promise
  // for (let i=1; i<=10; i++) {
  //   seedData.push(generatePostData());
  // }
  // // this will return a promise
  return Posts.insertMany(seedData);
}

// // used to generate data to put in db
// function generateContentWords() {
//   const content = [
//     'sTUFFFF and more stuff', 'THINGS and things', 'Brooklyn IS A PLACE', 'Bronx is another plae'];
//   return content[Math.floor(Math.random() * content.length)];
// }

// // used to generate data to put in db
// function generateTitleType() {
//   const title = ['Italian People Jumping', 'Thai Iced-tea and other helpful things', 'Colombian swashbuckeling'];
//   return title[Math.floor(Math.random() * title.length)];
// }

// // used to generate data to put in db
// function generateAuthor() {
//   const authors = ['Aaron Burgh', 'Bob Ross', 'Clive Cussler'];
//   const author = authors[Math.floor(Math.random() * authors.length)];
// }

// // generate an object represnting a restaurant.
// // can be used to generate seed data for db
// // or request.body data
// function generatePostData() {
//   return {
//     title: generateTitleType(),
//     content: generateContentwords(),
//     author: generateAuthor()
//   };
// }


// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure data from one test does not stick
// around for next one
// function tearDownDb() {
//   return new Promise((resolve, reject) => {
//     console.warn('Deleting database');
//     mongoose.connection.dropDatabase()
//       .then(result => resolve(result))
//       .catch(err => reject(err));
//   });
// }

describe('blogposts API resource', function() {

  // we need each of these hook functions to return a promise
  // otherwise we'd need to call a `done` callback. `runServer`,
  // `seedPostsData` and `tearDownDb` each return a promise,
  // so we return the value returned by these function calls.
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedPostsData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  // note the use of nested `describe` blocks.
  // this allows us to make clearer, more discrete tests that focus
  // on proving something small
  describe('GET endpoint', function() {

    it('should return all existing posts', function() {
      // strategy:
      //    1. get back all posts returned by by GET request to `/posts`
      //    2. prove res has right status, data type
      //    3. prove the number of posts we got back is equal to number
      //       in db.
      //
      // need to have access to mutate and access `res` across
      // `.then()` calls below, so declare it here so can modify in place
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          // so subsequent .then blocks can access response object
          res = _res;
          expect(res).to.have.status(200);
          // otherwise our db seeding didn't work
          expect(res.body).to.have.lengthOf.at.least(1);
          return Post.count();
        })
        .then(function(count) {
          expect(res.body).to.have.lengthOf(count);
        });
    });


    it('should return posts with right fields', function() {
      // Strategy: Get back all posts, and ensure they have expected keys

      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body.posts).to.be.a('array');
          expect(res.body.posts).to.have.lengthOf.at.least(1);

          res.body.forEach(function(post) {
            expect(post).to.be.a('object');
            expect(post).to.include.keys(
              'id', 'title', 'content', 'author');
          });
          resPost = res.body[0];
          return post.findById(resPost.id);
        })
        .then(function(post) {

          // expect(resPost.id).to.equal(post.id);
          expect(resPost.title).to.equal(post.title);
          expect(resPost.content).to.equal(post.content);
          expect(resPost.author).to.equal(post.author)
        });
    });
  });

  describe('POST endpoint', function() {
    // strategy: make a POST request with data,
    // then prove that the restaurant we get back has
    // right keys, and that `id` is there (which means
    // the data was inserted into db)
    it('should add a new post', function() {

      // const newPost = generatePostData();
      // let mostRecentGrade;

      const newPost = {
        title: faker.lorem.sentence(),
        author: {
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName(),
        },
        content: faker.lorem.text()
      }

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'id', 'title', 'content', 'author', 'created');
          expect(res.body.title).to.equal(newPost.title);
          // cause Mongo should have created id on insertion
          expect(res.body.id).to.not.be.null;
          expect(res.body.content).to.equal(newPost.content);
          expect(res.body.author).to.equal(
            `${newPost.author.firstName} ${newPost.author.lastName}`);
          return post.findById(res.body.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(newPost.title);
          expect(post.content).to.equal(newPost.content);
          expect(post.author.firstName).to.equal(newPost.author.firstName);
          expect(post.author.lastName).to.equal(newPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {

    // strategy:
    //  1. Get an existing restaurant from db
    //  2. Make a PUT request to update that restaurant
    //  3. Prove restaurant returned by request contains data we sent
    //  4. Prove restaurant in db is correctly updated
    it('should update fields you send over', function() {
      const updateData = {
        title: 'fofofofofofofof',
        content: 'futuristic fusion',
        author: {
          firstName: 'foo',
          lastName: 'bar'
        }
      };

      return Post
        .findOne()
        .then(function(post) {
          updateData.id = post.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          
          return Post.findById(updateData.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(updateData.title);
          expect(post.content).to.equal(updateData.content);
          expect(post.author.firstName).to.equal(updateData.author.firstName);
          expect(post.author.lastName).to.equal(updateData.author.lastName);
        });
    });
  });

  describe('DELETE endpoint', function() {
    // strategy:
    //  1. get a restaurant
    //  2. make a DELETE request for that restaurant's id
    //  3. assert that response has right status code
    //  4. prove that restaurant with the id doesn't exist in db anymore
    it('delete a post by id', function() {

      let post;

      return Post
        .findOne()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return Post.findById(post.id);
        })
        .then(function(_post) {
          expect(_post).to.be.null;
        });
    });
  });
});
