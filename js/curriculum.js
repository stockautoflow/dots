export function getDailyNumbers(day) {
    const baseDay = ((day - 1) % 30) + 1;
    const numbers = [];
    for (let i = 0; i < 10; i++) {
        numbers.push(baseDay + i);
    }
    return numbers;
}

export function generateQuiz(correctValue, currentDay) {
    let dummyValue;
    do {
        dummyValue = Math.floor(Math.random() * 50) + 1;
    } while (
        dummyValue === correctValue ||
        (currentDay <= 45 && Math.abs(dummyValue - correctValue) < 15) ||
        (currentDay > 45 && Math.abs(dummyValue - correctValue) < 5)
    );
    
    const answerSide = Math.random() > 0.5 ? 'left' : 'right';
    return {
        left: answerSide === 'left' ? correctValue : dummyValue,
        right: answerSide === 'right' ? correctValue : dummyValue,
        answerSide
    };
}

export function generateFormula(value) {
    if (value <= 1) return { numA: value, numB: 0 };
    const numA = Math.floor(Math.random() * (value - 1)) + 1;
    const numB = value - numA;
    return { numA, numB };
}
