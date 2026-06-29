export type OpeningMove = {
  move: string;
  name: string;
  description: string;
  style: 'aggressive' | 'solid' | 'theoretical';
};

export type OpeningNode = {
  children: Record<string, OpeningNode>;
  moveInfo?: OpeningMove;
};

export const OPENING_BOOK: OpeningNode = {
  children: {
    'e4': {
      moveInfo: { move: 'e4', name: 'King\'s Pawn Opening', description: 'Classic start, fighting for the center.', style: 'theoretical' },
      children: {
        'e5': {
          moveInfo: { move: 'e5', name: 'Open Game', description: 'Symmetrical response, leading to many classic openings.', style: 'theoretical' },
          children: {
            'Nf3': {
              moveInfo: { move: 'Nf3', name: 'King\'s Knight Opening', description: 'Developing a piece and attacking e5.', style: 'theoretical' },
              children: {
                'Nc6': {
                  moveInfo: { move: 'Nc6', name: 'Common response', description: 'Defending e5.', style: 'theoretical' },
                  children: {
                    'Bb5': {
                      moveInfo: { move: 'Bb5', name: 'Ruy Lopez', description: 'One of the most respected openings, putting pressure on the knight.', style: 'theoretical' },
                      children: {
                        'a6': {
                          moveInfo: { move: 'a6', name: 'Morphy Defense', description: 'Putting the question to the bishop immediately.', style: 'aggressive' },
                          children: {},
                        },
                        'Nf6': {
                          moveInfo: { move: 'Nf6', name: 'Berlin Defense', description: 'The "Berlin Wall", extremely solid and hard to break.', style: 'solid' },
                          children: {},
                        },
                      },
                    },
                    'Bc4': {
                      moveInfo: { move: 'Bc4', name: 'Italian Game', description: 'Developing the bishop to target the weak f7 square.', style: 'theoretical' },
                      children: {
                        'Bc5': {
                          moveInfo: { move: 'Bc5', name: 'Giuoco Piano', description: 'The "Quiet Game", focusing on slow development.', style: 'solid' },
                          children: {},
                        },
                        'Nf6': {
                          moveInfo: { move: 'Nf6', name: 'Two Knights Defense', description: 'More aggressive and counter-attacking than Bc5.', style: 'aggressive' },
                          children: {},
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        'c5': {
          moveInfo: { move: 'c5', name: 'Sicilian Defense', description: 'The most popular and aggressive response to e4.', style: 'aggressive' },
          children: {
            'Nf3': {
              moveInfo: { move: 'Nf3', name: 'Open Sicilian', description: 'Preparing d4 to open the center.', style: 'theoretical' },
              children: {
                'd6': {
                  moveInfo: { move: 'd6', name: 'Najdorf/Dragon setup', description: 'Preparing for a fierce counter-attack.', style: 'aggressive' },
                  children: {},
                },
                'Nc6': {
                  moveInfo: { move: 'Nc6', name: 'Classical Sicilian', description: 'Developing naturally and controlling d4.', style: 'solid' },
                  children: {},
                },
              },
            },
          },
        },
         'c6': {
           moveInfo: { move: 'c6', name: 'Caro-Kann Defense', description: 'A solid and reliable defense that prepares d5.', style: 'solid' },
           children: {
             'd4': {
               moveInfo: { move: 'd4', name: 'Main Line', description: 'Establishing central control.', style: 'theoretical' },
               children: {
                 'd5': {
                   moveInfo: { move: 'd5', name: 'Caro-Kann Response', description: 'Challenging the center directly.', style: 'solid' },
                   children: {},
                 },
               },
             },
           },
         },
      },
    },
    'd4': {
      moveInfo: { move: 'd4', name: 'Queen\'s Pawn Opening', description: 'A more strategic and positional start.', style: 'theoretical' },
      children: {
        'Nf6': {
          moveInfo: { move: 'Nf6', name: 'Indian Defenses', description: 'Hypermodern approach, controlling the center from afar.', style: 'theoretical' },
          children: {
            'c4': {
              moveInfo: { move: 'c4', name: 'Main line', description: 'Establishing a strong presence in the center.', style: 'theoretical' },
              children: {
                'e6': {
                  moveInfo: { move: 'e6', name: 'Nimzo-Indian setup', description: 'Flexible and solid.', style: 'solid' },
                  children: {},
                },
                'g6': {
                  moveInfo: { move: 'g6', name: 'King\'s Indian Defense', description: 'Hyper-aggressive, allowing White a big center to attack it later.', style: 'aggressive' },
                  children: {},
                },
              },
            },
          },
        },
        'd5': {
          moveInfo: { move: 'd5', name: 'Closed Game', description: 'Directly challenging the center.', style: 'theoretical' },
          children: {
            'c4': {
              moveInfo: { move: 'c4', name: 'Queen\'s Gambit', description: 'Offering a pawn to gain central control.', style: 'theoretical' },
              children: {
                'e6': {
                  moveInfo: { move: 'e6', name: 'Queen\'s Gambit Declined', description: 'The most reliable way to meet the gambit.', style: 'solid' },
                  children: {},
                },
                'c6': {
                  moveInfo: { move: 'c6', name: 'Slav Defense', description: 'A very sturdy defense protecting d5.', style: 'solid' },
                  children: {},
                },
              },
            },
          },
        },
      },
    },
  },
};

export function getOpeningMoves(history: string[], persona: string): OpeningMove[] {
  let currentNode = OPENING_BOOK;
  
  for (const move of history) {
    if (currentNode.children[move]) {
      currentNode = currentNode.children[move];
    } else {
      return []; // Out of book
    }
  }

  return Object.values(currentNode.children)
    .filter(c => c.moveInfo)
    .map(c => c.moveInfo as OpeningMove);
}

export function getOpeningMove(history: string[], persona: string): OpeningMove | null {
  const moves = getOpeningMoves(history, persona);
  if (moves.length === 0) return null;

  // Try to find a move that matches the persona style
  const styleMap: Record<string, string> = {
    'aggressive': 'aggressive',
    'patient': 'solid',
    'theoretical': 'theoretical'
  };
  
  const preferredStyle = styleMap[persona] || 'theoretical';
  const styledMove = moves.find(m => m.style === preferredStyle);
  
  return styledMove || moves[0];
}
