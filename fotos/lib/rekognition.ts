import * as AWS from "aws-sdk";
import {
  CreateCollectionResponse,
  DetectLabelsResponse,
  FaceRecord,
  IndexFacesResponse,
  SearchFacesResponse,
} from "aws-sdk/clients/rekognition";
import * as uuid from "uuid";

const getFaces = (externalImageId, specifiedFaceId?: string ): FaceRecord[] => {
  const faceId = specifiedFaceId || uuid.v1();
  const extImageId = externalImageId || uuid.v1();
  return [{
    Face: {
      BoundingBox: {
        Height: 0.37812501192092896,
        Left: 0.688281238079071,
        Top: 0.2291666716337204,
        Width: 0.2835937440395355,
      },
      Confidence: 99.8944320678711,
      ExternalImageId: extImageId,
      FaceId: faceId,
      ImageId: uuid.v1(),
    },
    FaceDetail: {
      BoundingBox: {
        Height: 0.37812501192092896,
        Left: 0.688281238079071,
        Top: 0.2291666716337204,
        Width: 0.2835937440395355,
      },
      Confidence: 99.8944320678711,
      Landmarks: [
        {
          Type: "eyeLeft",
          X: 0.771110475063324,
          Y: 0.3896821439266205,
        },
        {
          Type: "eyeRight",
          X: 0.8536998629570007,
          Y: 0.35018059611320496,
        },
        {
          Type: "nose",
          X: 0.7962719798088074,
          Y: 0.42947378754615784,
        },
        {
          Type: "mouthLeft",
          X: 0.7941058278083801,
          Y: 0.5068956017494202,
        },
        {
          Type: "mouthRight",
          X: 0.8827072381973267,
          Y: 0.47168639302253723,
        },
      ],
      Pose: {
        Pitch: 7.67142391204834,
        Roll: -18.639232635498047,
        Yaw: -23.584287643432617,
      },
      Quality: {
        Brightness: 57.94858169555664,
        Sharpness: 99.98487854003906,
      },
    },
  },
  {
    Face: {
      BoundingBox: {
        Height: 0.33125001192092896,
        Left: 0.07187499850988388,
        Top: 0.5260416865348816,
        Width: 0.24921874701976776,
      },
      Confidence: 99.99999237060547,
      ExternalImageId: extImageId,
      FaceId: faceId,
      ImageId: uuid.v1(),
    },
    FaceDetail: {
      BoundingBox: {
        Height: 0.33125001192092896,
        Left: 0.07187499850988388,
        Top: 0.5260416865348816,
        Width: 0.24921874701976776,
      },
      Confidence: 99.99999237060547,
      Landmarks: [
        {
          Type: "eyeLeft",
          X: 0.17182907462120056,
          Y: 0.6531587839126587,
        },
        {
          Type: "eyeRight",
          X: 0.24663801491260529,
          Y: 0.6492635607719421,
        },
        {
          Type: "nose",
          X: 0.2337799072265625,
          Y: 0.729832649230957,
        },
        {
          Type: "mouthLeft",
          X: 0.16631707549095154,
          Y: 0.769753098487854,
        },
        {
          Type: "mouthRight",
          X: 0.24043841660022736,
          Y: 0.7613717317581177,
        },
      ],
      Pose: {
        Pitch: -14.734925270080566,
        Roll: -4.630231857299805,
        Yaw: 32.88231658935547,
      },
      Quality: {
        Brightness: 36.554039001464844,
        Sharpness: 99.99671173095703,
      },
    },
  },
  {
    Face: {
      BoundingBox: {
        Height: 0.22708334028720856,
        Left: 0.569531261920929,
        Top: 0.5635416507720947,
        Width: 0.17031249403953552,
      },
      Confidence: 99.98350524902344,
      ExternalImageId: extImageId,
      FaceId: faceId,
      ImageId: uuid.v1(),
    },
    FaceDetail: {
      BoundingBox: {
        Height: 0.22708334028720856,
        Left: 0.569531261920929,
        Top: 0.5635416507720947,
        Width: 0.17031249403953552,
      },
      Confidence: 99.98350524902344,
      Landmarks: [
        {
          Type: "eyeLeft",
          X: 0.6284952759742737,
          Y: 0.6364575028419495,
        },
        {
          Type: "eyeRight",
          X: 0.6834288239479065,
          Y: 0.6475913524627686,
        },
        {
          Type: "nose",
          X: 0.6536866426467896,
          Y: 0.683709442615509,
        },
        {
          Type: "mouthLeft",
          X: 0.6290709972381592,
          Y: 0.7197924256324768,
        },
        {
          Type: "mouthRight",
          X: 0.6764854788780212,
          Y: 0.7242391705513,
        },
      ],
      Pose: {
        Pitch: 5.779657363891602,
        Roll: 8.2703857421875,
        Yaw: 1.2161580324172974,
      },
      Quality: {
        Brightness: 29.895315170288086,
        Sharpness: 99.97486114501953,
      },
    },
  },
  ];
};

const getFace = (externalImageId, specifiedFaceId) => {
  const faces = getFaces(externalImageId, specifiedFaceId);
  const idx = Math.floor(Math.random() * faces.length);
  return faces[idx];
};

function offlineClient() {
  return {
    createCollection: (params) => ({
      promise: (): Promise<CreateCollectionResponse> => new Promise((res) => res({})),
    }),
    detectLabels: (params) => ({
      promise: (): Promise<DetectLabelsResponse> => new Promise((res) => res({
        Labels: [
          {
            Confidence: 99.29840850830078,
            Name: "Person",
          },
          {
            Confidence: 89.55351257324219,
            Name: "Face",
          },
          {
            Confidence: 89.55351257324219,
            Name: "Portrait",
          },
        ],
      })),
    }),
    indexFaces: (params) => ({
      promise: (): Promise<IndexFacesResponse> => new Promise((res) => res({
        FaceModelVersion: "3.0",
        FaceRecords: [getFace(params.ExternalImageId, undefined)],
      })),
    }),
    searchFaces: ({ FaceId }) => ({
      promise: (): Promise<SearchFacesResponse> => new Promise((res) => {
        const originalId = FaceId || uuid.v1();
        const face = getFace(null, FaceId);
        res({
          FaceMatches: [{
            Face: {
              ExternalImageId: face.Face![0].ExternalImageId,
              FaceId: face.Face![0].FaceId,
            },
            Similarity: originalId === face.Face![0].FaceId ? 100 : 0,
          }],
          SearchedFaceId: originalId,
        });
      }),
    }),
  };
}

const client = process.env.IS_OFFLINE ? offlineClient() : new AWS.Rekognition();

export default client;
