let food = []
const organisms = []

const VISION = 150
const STEP = 50
const MAX_WEIGHT = 50

const WIDTH = 800
const HEIGHT = WIDTH

function lifeCycle(organism) {
  const foodAmount = food.length
  food = food.filter(item => {
    const dx = item.x - organism.x
    const dy = item.y - organism.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance > organism.weight + 3
  })
  organism.weight += foodAmount - food.length

  if (organism.weight > MAX_WEIGHT) {
    const index = organisms.find(it => it === organism)
    organisms.splice(index, 1)
  } else {
    organism.messages = [{
      role: 'system',
      content: SYSTEM_PROMPT
    }]
    pushVision(organism)
    pushState(organism)
  }
}

function createOrganism(weight, x, y, top = false) {
  const organism = {
    weight,
    x, y,
    messages: []
  }
  organisms[top ? 'unshift' : 'push'](organism)
  lifeCycle(organism)
}

function drawOrganisms(ctx) {
  for (const organism of organisms) {
    ctx.beginPath();
    ctx.arc(organism.x, organism.y, organism.weight + 3, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "blue";
    ctx.stroke();
  }
}

function drawFood(ctx) {
  for (const { x, y } of food) {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "orange";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
}

function redraw(ctx) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  drawFood(ctx)
  drawOrganisms(ctx)
}

function pushState(organism) {
  const content = `Total population: ${organisms.length};

  Your weight is: ${organism.weight};
  Your coordinates are X=${organism.x} and Y=${organism.y};

  Respond with an action in a requested format.`

  organism.messages.push({
    role: 'system',
    content
  })
}

function pushVision(organism) {
  // TODO: food, organisms
  const leftWall = organism.x
  const topWall = organism.y
  const rightWall = WIDTH - organism.x
  const bottomWall = HEIGHT - organism.y
  const nearestFood = food.reduce((nearest, item) => {
    const dx = item.x - organism.x
    const dy = item.y - organism.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (!nearest || distance < nearest.distance) {
      return {
        distance,
        dx,
        dy
      }
    }
    return nearest
  }, null)

  const isNothing = leftWall > VISION && rightWall > VISION && topWall > VISION && bottomWall > VISION && !nearestFood
  const content = `${isNothing ? 'You see nothing around you in your vision range.' : ''}
  ${leftWall < VISION ? `You see left wall ${leftWall} points to the left;` : ''}
  ${rightWall < VISION ? `You see right wall ${rightWall} points to the right;` : ''}
  ${topWall < VISION ? `You see top wall ${topWall} points above;` : ''}
  ${bottomWall < VISION ? `You see bottom wall ${bottomWall} points below;` : ''}
  ${nearestFood ? `You see some food ${Math.abs(nearestFood.dx - organism.weight)} points to the ${nearestFood.dx > 0 ? 'right' : 'left'} (horizontally) and ${Math.abs(nearestFood.dy - organism.weight)} points ${nearestFood.dy > 0 ? 'below' : 'above'} (vertically)` : ''}`

  organism.messages.push({
    role: 'system',
    content
  })
}

function move(organism, v, h) {
  if (Math.abs(v) > STEP || Math.abs(h) > STEP) {
    return
  }
  organism.x = Math.min(WIDTH, Math.max(0, organism.x + Number(h) || 0))
  organism.y = Math.min(HEIGHT, Math.max(0, organism.y + Number(v) || 0))
}

function split(i) {
  const { x, y, weight } = organisms[i]
  organisms.splice(i, 1)
  if (weight >= 3 * 2) {
    const partWeight = Math.floor(weight / 2)
    createOrganism(partWeight, x, y, true);
    createOrganism(partWeight, x, y, true);
    return 1
  } else {
    return -1
  }
}

// const action = (name, description, parameters) => ({
//   type: 'function',
//   function: {
//     name,
//     description,
//     parameters: {
//       type: 'object',
//       properties: Object.fromEntries(parameters.map(([name, type, description]) => [name, { type, description }])),
//       required: parameters.map(([name]) => name)
//     },
//   }
// })

const SYSTEM_PROMPT = `You are a primitive organism.

# Rules
- Your actions are limited to "move" and "split"
- You are strictly forbidden from writing game states. You are only allowed to think and act, you are just a controller. Game state will be populated by system automatically.
- To grow you need to find food and reach it to eat it
- If any organism has weight less than 3 after splitting, it will die instantly
- If any organism has weight more than ${MAX_WEIGHT}, it will die instantly
- Your goal is to reach maximum population size

# Action descriptions:
- "move": Use "move" to move V steps vertically and H steps horizontally. You can move up to ${STEP} (-${STEP})  points at once. Use negative values to move top or left and positive values to move right or bottom. Zero means no movement by this direction. The format of usage is \`move:v:h\`, where v is integer steps to move vertically. Negative to the left, positive to the right, 0 to keep vertical position. h is integer to move horizontally. Negative to the top, positive to the bottom, 0 to keep horizontal position.
- "split": Use "split" to split into two organisms which will divide your current weight. Format is just \`split\`.

# Responses
It's important that you can only do one action per response and then you must wait for state broadcast. Whenever you are writing a response to choose an action, you can write one sentence of your thoughts at the beginning, but you must always end your message with an empty line followed by the action with a proper format.

This is just an example how one might move:
\`\`\`
Some thoughts here explaining why move and not split. Then explanation where to move. It must mention v and h values which will be used and ${STEP} (-${STEP}) points limit in each direction must be considered.

move:${STEP}:-5
\`\`\`;

Or to split, just for example:
\`\`\`
Some thoughts here explaining why doing split

split
\`\`\`.

You are not allowed to write anything except of messages like these.`
// const ACTIONS = [
//   // action('vision', `Use "vision" to check what's around you`, []),
//   action(
//     'move',
//     `Use "move" to move V steps vertically and H steps horizontally. You can move up to ${STEP} (or -${STEP}) points at once. Use negative values to move top or left and positive values to move right or bottom. Zero means no movement by this direction.`,
//     [
//       ['v', 'integer', 'Steps to move vertically. Negative to the left, positive to the right, 0 to keep vertical position.'],
//       ['h', 'integer', 'Steps to move horizontally. Negative to the top, positive to the bottom, 0 to keep horizontal position.'],
//     ]
//   ),
//   action('split', `Use "split" to split into two organisms which will divide your current weight. Beware!! It's important that if resulting weight is less than 3 for any organism, it will die instantly, so you need at least 3*2 weight to successfully split`, []),
// ]

async function generate(messages) {
  const request = await fetch(`http://localhost:11434/api/chat`, {
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      model: 'falcon3:10b',
      messages,
      // tools: ACTIONS,
      stream: false
    })
  })
  const response = await request.json()
  const message = response.message
  return message
}

function seedFood(amount) {
  for (let j = 0; j < amount; j += 1) {
    food.push({
      x: Math.floor(Math.random() * WIDTH),
      y: Math.floor(Math.random() * HEIGHT)
    })
  }
}

function seedOrganisms(amount) {
  for (let j = 0; j < amount; j += 1) {
    createOrganism(
      30,
      Math.floor(Math.random() * WIDTH),
      Math.floor(Math.random() * HEIGHT)
    )
  }
}

self.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('canvas')
  canvas.width = 800
  canvas.height = 800

  const ctx = canvas.getContext('2d')
  const scale = self.devicePixelRatio
  ctx.scale(scale, scale)

  seedFood(1000)
  seedOrganisms(2)
  redraw(ctx)

  while (true) {
    for (const organism of organisms) {
      lifeCycle(organism)
    }
    for (let i = 0; i < organisms.length; i += 1) {
      const organism = organisms[i]

      const message = await generate(organism.messages)
      organism.messages.push(message)

      const parsed = message.content.replaceAll('`', '').trim().split('\n\n')
      const thoughts = parsed.slice(0, -1).join('\n')
      const action = parsed.at(-1)?.trim() ?? ''
      console.log(`[${organism.weight}] `, thoughts)
      const [kind, ...args] = action.split(':')
      switch (kind) {
        case 'move': {
          const [v, h] = args
          console.log(`$ move`, v, h)
          move(organism, v, h)
          break
        }
        case 'split': {
          console.log(`$ split`)
          const change = split(i)
          i += change
          break
        }
        default: {
          console.warn(`Unknown kind: '${kind}'`)
        }
      }
      redraw(ctx)
    }
  }
})
