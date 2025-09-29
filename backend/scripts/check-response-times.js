const { PlayerAnswer, Game, User, Question } = require('../models');

async function checkResponseTimes() {
  try {
    console.log('📊 Checking Response Times...\n');

    // Get all player answers with response times
    const answers = await PlayerAnswer.findAll({
      where: {
        response_time_ms: {
          [require('sequelize').Op.not]: null
        }
      },
      include: [
        {
          model: User,
          attributes: ['nickname', 'whatsapp_number']
        },
        {
          model: Game,
          attributes: ['id', 'status', 'start_time']
        },
        {
          model: Question,
          attributes: ['question_text', 'question_order']
        }
      ],
      order: [['answered_at', 'DESC']]
    });

    if (answers.length === 0) {
      console.log('❌ No response time data found');
      return;
    }

    // Calculate statistics
    const responseTimes = answers.map(a => a.response_time_ms);
    const totalAnswers = responseTimes.length;
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalAnswers;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    // Convert to seconds for readability
    const avgSeconds = (averageResponseTime / 1000).toFixed(2);
    const minSeconds = (minResponseTime / 1000).toFixed(2);
    const maxSeconds = (maxResponseTime / 1000).toFixed(2);

    console.log('📈 RESPONSE TIME STATISTICS:');
    console.log('============================');
    console.log(`📊 Total Answers: ${totalAnswers}`);
    console.log(`⏱️  Average Response Time: ${avgSeconds} seconds (${averageResponseTime.toFixed(0)}ms)`);
    console.log(`⚡ Fastest Response: ${minSeconds} seconds (${minResponseTime}ms)`);
    console.log(`🐌 Slowest Response: ${maxSeconds} seconds (${maxResponseTime}ms)`);
    console.log('');

    // Response time distribution
    const under5s = responseTimes.filter(t => t < 5000).length;
    const under10s = responseTimes.filter(t => t < 10000).length;
    const over10s = responseTimes.filter(t => t >= 10000).length;

    console.log('📊 RESPONSE TIME DISTRIBUTION:');
    console.log('==============================');
    console.log(`⚡ Under 5 seconds: ${under5s} (${((under5s/totalAnswers)*100).toFixed(1)}%)`);
    console.log(`⏱️  Under 10 seconds: ${under10s} (${((under10s/totalAnswers)*100).toFixed(1)}%)`);
    console.log(`🐌 Over 10 seconds: ${over10s} (${((over10s/totalAnswers)*100).toFixed(1)}%)`);
    console.log('');

    // Recent games analysis
    const recentGames = await Game.findAll({
      where: {
        status: 'finished'
      },
      include: [
        {
          model: PlayerAnswer,
          where: {
            response_time_ms: {
              [require('sequelize').Op.not]: null
            }
          },
          required: true
        }
      ],
      order: [['end_time', 'DESC']],
      limit: 5
    });

    if (recentGames.length > 0) {
      console.log('🎮 RECENT GAMES ANALYSIS:');
      console.log('=========================');
      
      for (const game of recentGames) {
        const gameAnswers = game.PlayerAnswers || [];
        const gameAvgTime = gameAnswers.reduce((sum, a) => sum + a.response_time_ms, 0) / gameAnswers.length;
        const gameAvgSeconds = (gameAvgTime / 1000).toFixed(2);
        
        console.log(`🎯 Game ${game.id.slice(0, 8)}... - Avg: ${gameAvgSeconds}s (${gameAnswers.length} answers)`);
      }
    }

    // Top 5 fastest responses
    const fastestAnswers = answers
      .sort((a, b) => a.response_time_ms - b.response_time_ms)
      .slice(0, 5);

    console.log('\n⚡ TOP 5 FASTEST RESPONSES:');
    console.log('===========================');
    fastestAnswers.forEach((answer, index) => {
      const timeSeconds = (answer.response_time_ms / 1000).toFixed(2);
      console.log(`${index + 1}. ${answer.User.nickname} - ${timeSeconds}s (${answer.Question.question_text.slice(0, 50)}...)`);
    });

    // Top 5 slowest responses
    const slowestAnswers = answers
      .sort((a, b) => b.response_time_ms - a.response_time_ms)
      .slice(0, 5);

    console.log('\n🐌 TOP 5 SLOWEST RESPONSES:');
    console.log('===========================');
    slowestAnswers.forEach((answer, index) => {
      const timeSeconds = (answer.response_time_ms / 1000).toFixed(2);
      console.log(`${index + 1}. ${answer.User.nickname} - ${timeSeconds}s (${answer.Question.question_text.slice(0, 50)}...)`);
    });

  } catch (error) {
    console.error('❌ Error checking response times:', error);
  }
}

// Run the analysis
checkResponseTimes().then(() => {
  console.log('\n✅ Response time analysis complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

