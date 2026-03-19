const QUESTION_WIKIPEDIA_TITLES: Record<string, string> = {
  "0b2cf618-5b71-4f0c-9308-f7d651a4d111": "Eiffel Tower",
  "4e3a538c-93a2-4415-bcca-d589447f7b80": "Statue of Liberty",
  "917d31f9-bd8a-41ec-a66a-70632c7f0e91": "Sydney Opera House",
  "880a1229-dddb-4ce6-9b76-6f2e8f44f76b": "Taj Mahal",
  "cfc5c85d-73d4-4bca-a185-cff5a58e32f2": "Christ the Redeemer (statue)",
  "5e95e3df-eef3-4306-a8ad-8dd0d32fbf9d": "Giza pyramid complex",
  "930f9a4d-9d3a-4649-bd8a-cf483d0f0df3": "Machu Picchu",
  "b7ed89f7-8b55-4e61-a195-9e6a6f6514a1": "Mount Fuji",
  "ad7a2a03-b7a2-4270-9992-a62a339eb333": "Angkor Wat",
  "7af5178a-5d8a-49f5-ae88-f17bac9f0a92": "Reykjavik",
  "2aa713f1-b8aa-4b95-a5f3-7f8ce6041df5": "Cape Town",
  "c01e40ca-7f4e-4561-a5f2-b9500c34b13a": "Golden Gate Bridge",
  "11d5a6b7-c801-4b8c-9d0e-1f2a3b4c5d60": "Big Ben",
  "22e6b7c8-d912-4c9d-8e1f-2a3b4c5d6e71": "Colosseum",
  "33f7c8d9-e023-4dae-9f20-3b4c5d6e7f82": "Burj Khalifa",
  "44a8d9e0-f134-4ebf-8a31-4c5d6e7f8093": "CN Tower",
  "55b9e0f1-a245-4fc0-9b42-5d6e7f8091a4": "Sagrada Familia",
  "66ca0f12-b356-40d1-8c53-6e7f8091a2b5": "Space Needle",
  "c8f6a7f2-1ce0-4ff0-8556-3f7131f39a11": "Paris",
  "fa93d98c-4e58-4fce-b91d-324f4c5d2df1": "Tokyo",
  "5bf7df60-2c77-4290-9b5f-3c1ffab37d52": "Cairo",
  "ebdb2832-a70b-4282-bf5b-6799895adf31": "Ottawa",
  "9f2de8f7-dc7c-42fd-87d3-3b009f97989f": "Brasilia",
  "0d9e2d6a-6c49-4046-aef3-b19d18b0ba01": "Petra",
  "a0e4a3fe-1d36-4914-9ca3-c72177cf05dd": "Chichen Itza",
  "77db1023-c467-41e2-9d64-7f8091a2b3c6": "Great Wall of China",
  "88ec2134-d578-42f3-8e75-8091a2b3c4d7": "Stonehenge",
  "99fd3245-e689-4304-9f86-91a2b3c4d5e8": "Forbidden City",
  "aa0e4356-f79a-4415-8a97-a2b3c4d5e6f9": "Moai",
  "bb1f5467-a8ab-4526-9ba8-b3c4d5e6f70a": "Mount Kilimanjaro",
  "cc206578-b9bc-4637-8cb9-c4d5e6f7081b": "Uluru",
  "dd317689-cacd-4748-9dca-d5e6f708192c": "Washington, D.C.",
  "ee42879a-dbde-4859-8edb-e6f708192a3d": "Rome",
  "ff5398ab-ecef-496a-9fec-f708192a3b4e": "Madrid",
  "0a64a9bc-fd01-4a7b-8afd-08192a3b4c5f": "Seoul",
  "1b75bacd-0e12-4b8c-9b0e-192a3b4c5d60": "Wellington",
  "2c86cbde-1f23-4c9d-8c1f-2a3b4c5d6e71": "Buenos Aires"
};

interface WikipediaSummaryResponse {
  originalimage?: {
    source?: string;
  };
  thumbnail?: {
    source?: string;
  };
}

export async function fetchQuestionImageUrl(
  questionId: string,
  signal?: AbortSignal
): Promise<string | null> {
  const title = QUESTION_WIKIPEDIA_TITLES[questionId];

  if (!title) {
    return null;
  }

  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    {
      headers: {
        Accept: "application/json"
      },
      signal
    }
  );

  if (!response.ok) {
    return null;
  }

  // Wikipedia summary gives us a fast public image fallback
  // without shipping a separate media backend for the MVP.
  const payload = (await response.json()) as WikipediaSummaryResponse;
  return payload.originalimage?.source ?? payload.thumbnail?.source ?? null;
}
