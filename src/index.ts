import { Context, Random, Schema } from 'koishi'

export const usage= `
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron&display=swap');
body {
  background: #000;
  overflow: hidden;
  margin: 0;
  padding: 0;
  height: 100vh;
  perspective: 1000px;
}
.text.who-is-baka {
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Orbitron', sans-serif;
  color: #fff;
  position: relative;
  font-size: 4em;
  text-transform: uppercase;
  animation: floating 3s infinite;
}
.text.who-is-baka::before, .text.who-is-baka::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  mix-blend-mode: difference;
  animation: stripes 2s linear infinite;
}
.text.who-is-baka::after {
  animation-delay: 1s;
}
@keyframes floating {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-20px, -20px, 50px); }
}
@keyframes stripes {
  100% { background-position: 100vw 0; }
}
</style>

<div class="text who-is-baka">who-is-baka</div>

<h2>插件简介</h2>
<p>一个问答版谁是卧底的小游戏嗷，很阉割的（）</p>
<p><code>PS:灵感来源--小潮院长的视频《贱谍过家家》系列</p></code>

`
// 定义插件的配置接口
interface Config {
  words: string[]
}

// 定义插件的配置 Schema
export const Config: Schema<Config> = Schema.object({
  words: Schema.array(Schema.string()).default(['马桶', '卧底', '撤硕'])
});
// 插件名称
export const name = 'qycblzj-who-is-baka'

// 将 apply 函数声明为异步，以支持异步操作
export function apply(ctx: Context, config: Config) {
  // 使用配置中的词组
  let words = config.words;
  let players: string[] = []
  let word: string = ''
  let undercover: string = ''
  let votes: Record<string, string> = {}
  let isGameOver: boolean = false

  // 开始游戏
ctx.command('who-is-baka/start', '开始游戏')
.action(async ({ session }) => {
  if (players.length === 4) {
    word = Random.pick(words);
    const undercoverIndex = Math.floor(Math.random() * 4);
    await Promise.all(players.map(async (playerId, index) => {
    const secretWord = index === undercoverIndex ? '' : word;
    if (index === undercoverIndex) {
      undercover = playerId;
      // 使用 sendPrivateMessage 发送私聊消息给卧底
      await session.bot.sendPrivateMessage(playerId, '你是卧底，你没有词语。你的目标是通过问答获取词语的信息最后猜出词语哦~如果其他玩家都投完票了你也必须投票哦！');
    } else {
      // 使用 sendPrivateMessage 发送私聊消息给平民
      await session.bot.sendPrivateMessage(playerId, `你的词语是：${secretWord}。你的目标是通过问答推断谁是卧底，卧底没有词语哦！`);
    }
  }));
    return '游戏的规则非常的简单啊，就《谁是卧底》的问答版，玩家们可以互相提问获得信息，过程中随时可以投票，如果投错了或者卧底猜出词了卧底就赢了！游戏的规则就是这么简单啊，你听懂了吗？管你听没听懂！问就完了！！！';
  } else {
    return '玩家数量不足，无法开始游戏。';
  }
});

  // 加入游戏
  ctx.command('who-is-baka/join', '加入游戏')
    .action(({ session }) => {
      const playerId = session.userId
      if (players.includes(playerId)) {
        return '你已经在游戏中了。'
      } else if (players.length < 4) {
        players.push(playerId)
        return `玩家 ${playerId} 加入游戏。当前玩家数：${players.length}/4`
      } else {
        return '游戏人数已满，无法加入。'
      }
    })

  // 投票
ctx.command('who-is-baka/vote <targetId>', '投票决定谁是卧底')
.action(async ({ session }, targetId: string) => {
  if (isGameOver) return '游戏已经结束。'
  if (!players.includes(session.userId)) return '你还没有加入游戏。'
  
  // 解析目标 ID，确保其格式正确（例如，去除艾特符号）
  // 假设 targetId 是以 '@' 开头的
  const actualTargetId = targetId.startsWith('@') ? targetId.slice(1) : targetId;
  
  if (!players.includes(actualTargetId)) return '投票对象不在游戏中。'
  if (votes[session.userId]) return '你已经投过票了。'

  votes[session.userId] = actualTargetId;
  if (Object.keys(votes).length === players.length) {
    const voteResult = tallyVotes(votes);
    return endGame(voteResult);
  }
  return `玩家 ${session.userId} 投票给了 ${actualTargetId}。`
})

  // 卧底猜词
  ctx.command('who-is-baka/guess <guessWord>', '卧底猜词')
    .action(({ session }, guessWord: string) => {
      if (isGameOver) return '游戏已经结束。'
      if (session.userId !== undercover) return '你不是卧底。'
      isGameOver = true
      if (guessWord === word) {
        return `猜测正确，卧底胜利！卧底是：${undercover}。`
      } else {
        return `猜测错误，平民胜利！卧底是：${undercover}。`
      }
    })

  // 计票并决定游戏结果
  function tallyVotes(votes: Record<string, string>): [string, number] {
    const voteCounts: Record<string, number> = {}
    Object.values(votes).forEach((id) => {
      voteCounts[id] = (voteCounts[id] || 0) + 1
    })
    return Object.entries(voteCounts).reduce((highest, entry) => entry[1] > highest[1] ? entry : highest, ['', 0])
  }

  // 结束游戏
  function endGame([votedId, votes]: [string, number]): string {
    isGameOver = true
    if (votedId === undercover) {
      return `卧底是：${undercover}。平民胜利！`
    } else {
      return `卧底是：${undercover}。卧底胜利！`
    }
  }

  // 重置游戏状态
  ctx.on('before-send', () => {
    if (isGameOver) {
      players = [];
      votes = {};
      word = '';
      undercover = '';
      isGameOver = false;
    }
  });
}