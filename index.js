const app = require('express')();
require('dotenv').config();
const faunadb = require('faunadb');
const database = new faunadb.Client({ secret: process.env.DATABASE_KEY });

const { Ref, Paginate, Get, Match, Index, Create,
            Collection, Join, Call, Function: dbFn } = faunadb.query;

/*
    Call( dbFn("getUser"), req.params.user ) = 
        Query(
            Lambda(
                "userId",
                Select("ref", Get(Match(Index("users_by_email"), Var("userId"))) )
            )
        )
*/


// create an object using fauna function to get value of one field
const createPost = async (req, res) =>
    {
        const postText = req.body.text;
        const post =
            {
                user: Call( dbFn("getUser"), req.params.user ),
                msgText: postText
            };

        const createdPost = await database.query(
            Create(
                Collection('posts'),
                { post }
            )
        );

        res.send(createdPost);
    };

// get one collection object
const getPost = async (req, res) =>
    {
        const post = await database.query(
            Get(
                Ref(
                    Collection('posts'),
                    req.params.id
                )
            )
        );

        res.send(post);
    };

// get all collection objects matching one field
const getUserPosts = async (req, res) =>
    {
        const userPosts = await database.query(
            Paginate(
                Match(
                    Index('posts_by_user'),
                    Call(dbFn("getUser"), req.params.user)
                )
            )
        );

        res.send(userPosts);
    };

// many to many - create a collection object
const followAUser = async (req, res) =>
    {
        const data =
            {
                follower: Call(dbFn("getUser"), req.body.follower),
                followee: Call(dbFn("getUser"), req.body.followee)
            };

        const relationship = await database.query(
            Create(
                Collection('relationships'),
                { data }
            )
        );

        res.send(relationship);
    };

// get collection objects using another collection object as foreign key
const getFolloweesPosts = async (req, res) =>
    {
        const followeesPosts = await database.query(
            Paginate(
                Join(
                    Match(
                        Index('followees_by_follower'),
                        Call( dbFn("getUser"), req.params.id )
                    ),
                    Index('posts_by_user')
                )
            )
        );

        res.send(followeesPosts);
    };

// Routes
app.post('/posts/:user', createPost);
app.get('/posts/:id', getPost);
app.get('/posts/:user', getUserPosts);
app.post('/relationship', followAUser);
app.get('/user/:id', getFolloweesPosts);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));