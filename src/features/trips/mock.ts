import type { GeneratedTripT } from "./generate";

export const mockTrip: GeneratedTripT = {
  destination: "Lisbon, Portugal",
  summary:
    "A sun-drenched 3-day walk through Lisbon's tiled alleys, pastel de nata shops, and sunset miradouros.",
  totalEstimatedCost: 412,
  days: [
    {
      dayNumber: 1,
      activities: [
        {
          name: "Pastéis de Belém breakfast",
          description:
            "Warm custard tarts at the original 1837 bakery, paired with a galão.",
          type: "breakfast",
          durationMinutes: 45,
          address: "R. de Belém 84-92, 1300-085 Lisboa",
          estimatedCost: 8,
        },
        {
          name: "Jerónimos Monastery",
          description:
            "UNESCO-listed Manueline masterpiece — cloisters and Vasco da Gama's tomb.",
          type: "activity",
          durationMinutes: 90,
          address: "Praça do Império 1400-206, Lisboa",
          estimatedCost: 14,
        },
        {
          name: "Belém Tower riverfront walk",
          description:
            "16th-century fortress guarding the Tagus, with views across to Almada.",
          type: "activity",
          durationMinutes: 75,
          address: "Av. Brasília, 1400-038 Lisboa",
          estimatedCost: 8,
        },
        {
          name: "Lunch at Time Out Market",
          description:
            "Sample dozens of Lisbon's best chefs under one roof at Mercado da Ribeira.",
          type: "lunch",
          durationMinutes: 75,
          address: "Av. 24 de Julho 49, 1200-479 Lisboa",
          estimatedCost: 22,
        },
        {
          name: "Tram 28 through Alfama",
          description:
            "Ride the historic yellow tram through the oldest quarter of Lisbon.",
          type: "activity",
          durationMinutes: 60,
          address: "Martim Moniz, 1100-341 Lisboa",
          estimatedCost: 3,
        },
        {
          name: "Miradouro de Santa Luzia sunset",
          description:
            "Azulejo-tiled terrace with panoramic views over Alfama rooftops and the river.",
          type: "activity",
          durationMinutes: 45,
          address: "Largo Santa Luzia, 1100-487 Lisboa",
          estimatedCost: 0,
        },
        {
          name: "Dinner at Ramiro",
          description:
            "Legendary seafood house — prawns, clams à bulhão pato, and a prego to finish.",
          type: "dinner",
          durationMinutes: 120,
          address: "Av. Almirante Reis 1, 1150-007 Lisboa",
          estimatedCost: 55,
        },
      ],
    },
    {
      dayNumber: 2,
      activities: [
        {
          name: "Breakfast at Dear Breakfast",
          description:
            "Scandinavian-style brunch: avocado toast, eggs Benedict, flat whites.",
          type: "breakfast",
          durationMinutes: 60,
          address: "R. das Gáveas 53, 1200-206 Lisboa",
          estimatedCost: 14,
        },
        {
          name: "LX Factory",
          description:
            "Repurposed riverside industrial park — indie shops, street art, Ler Devagar bookstore.",
          type: "activity",
          durationMinutes: 120,
          address: "R. Rodrigues de Faria 103, 1300-501 Lisboa",
          estimatedCost: 0,
        },
        {
          name: "MAAT museum",
          description:
            "Art, architecture and technology museum inside a wave-shaped riverfront building.",
          type: "activity",
          durationMinutes: 90,
          address: "Av. Brasília, 1300-598 Lisboa",
          estimatedCost: 11,
        },
        {
          name: "Lunch at A Cevicheria",
          description:
            "Peruvian-Portuguese fusion; order the classic ceviche under the giant octopus.",
          type: "lunch",
          durationMinutes: 75,
          address: "R. Dom Pedro V 129, 1250-096 Lisboa",
          estimatedCost: 28,
        },
        {
          name: "Príncipe Real gardens + boutiques",
          description:
            "Browse Embaixada concept store in a neo-Moorish palace, then relax under the cedar.",
          type: "activity",
          durationMinutes: 75,
          address: "Praça do Príncipe Real, 1250-096 Lisboa",
          estimatedCost: 0,
        },
        {
          name: "Miradouro de São Pedro de Alcântara",
          description: "Famous viewpoint looking across to São Jorge Castle.",
          type: "activity",
          durationMinutes: 30,
          address: "R. de São Pedro de Alcântara, 1200-470 Lisboa",
          estimatedCost: 0,
        },
        {
          name: "Fado dinner at Tasca do Chico",
          description:
            "Traditional fado in a cozy Bairro Alto tasca — queue early.",
          type: "dinner",
          durationMinutes: 150,
          address: "R. do Diário de Notícias 39, 1200-141 Lisboa",
          estimatedCost: 35,
        },
      ],
    },
    {
      dayNumber: 3,
      activities: [
        {
          name: "Coffee at Fábrica Coffee Roasters",
          description:
            "Serious specialty coffee and pastries in a minimalist space.",
          type: "breakfast",
          durationMinutes: 45,
          address: "R. das Portas de Santo Antão 136, 1150-269 Lisboa",
          estimatedCost: 7,
        },
        {
          name: "São Jorge Castle",
          description:
            "Moorish hilltop castle with city-wide panoramas and resident peacocks.",
          type: "activity",
          durationMinutes: 120,
          address: "R. de Santa Cruz, 1100-129 Lisboa",
          estimatedCost: 15,
        },
        {
          name: "Alfama walking loop",
          description:
            "Wind through the oldest quarter — past Sé Cathedral and down to the river.",
          type: "activity",
          durationMinutes: 90,
          address: "Largo da Sé, 1100-585 Lisboa",
          estimatedCost: 0,
        },
        {
          name: "Lunch at Prado",
          description:
            "Farm-to-table tasting menu from wood-fire chef António Galapito.",
          type: "lunch",
          durationMinutes: 90,
          address: "Tv. das Pedras Negras 2, 1100-404 Lisboa",
          estimatedCost: 35,
        },
        {
          name: "Day trip to Sintra (half)",
          description:
            "Train from Rossio; visit Pena Palace and the Initiation Well at Quinta da Regaleira.",
          type: "activity",
          durationMinutes: 240,
          address: "Estação de Sintra, 2710-565 Sintra",
          estimatedCost: 22,
        },
        {
          name: "Sunset at Cabo da Roca",
          description:
            "Westernmost point of continental Europe — dramatic cliffs over the Atlantic.",
          type: "activity",
          durationMinutes: 60,
          address: "Estrada do Cabo da Roca, 2705-001 Colares",
          estimatedCost: 0,
        },
        {
          name: "Farewell dinner at Belcanto",
          description:
            "José Avillez's two-Michelin-star tasting menu — book weeks ahead.",
          type: "dinner",
          durationMinutes: 180,
          address: "Largo de São Carlos 10, 1200-410 Lisboa",
          estimatedCost: 85,
        },
      ],
    },
  ],
};
