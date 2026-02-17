import { useState, useRef, useCallback } from 'react'
import './App.css'

// 楼层定义
const FLOORS = ['B2', 'B1', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10']

// 音频缓存
const audioCache: Record<string, HTMLAudioElement> = {}

// 预加载音频
const preloadAudio = () => {
  const audioFiles = [
    'door_open', 'door_close', 'going_up', 'going_down',
    'arrive_B2', 'arrive_B1', 'arrive_F1', 'arrive_F2', 'arrive_F3',
    'arrive_F4', 'arrive_F5', 'arrive_F6', 'arrive_F7', 'arrive_F8',
    'arrive_F9', 'arrive_F10'
  ]
  
  audioFiles.forEach(name => {
    const audio = new Audio(`/audio/${name}.mp3`)
    audio.preload = 'auto'
    audioCache[name] = audio
  })
}

// 播放音频函数
const playAudio = (name: string) => {
  if (audioCache[name]) {
    audioCache[name].currentTime = 0
    audioCache[name].play().catch(() => {
      console.log('Audio play failed:', name)
    })
  }
}

// 播报门动作
const announceDoor = (action: 'open' | 'close') => {
  playAudio(action === 'open' ? 'door_open' : 'door_close')
}

// 播报运行方向
const announceDirection = (direction: 'up' | 'down') => {
  playAudio(direction === 'up' ? 'going_up' : 'going_down')
}

// 播报到达楼层
const announceArrival = (floor: string) => {
  playAudio(`arrive_${floor}`)
}

function App() {
  // 状态管理
  const [currentView, setCurrentView] = useState<'inside' | 'outside'>('inside')
  const [currentFloor, setCurrentFloor] = useState('F1')
  const [targetFloor, setTargetFloor] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [isDoorOpen, setIsDoorOpen] = useState(true)
  const [selectedFloors, setSelectedFloors] = useState<Set<string>>(new Set())
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const [displayFloor, setDisplayFloor] = useState('F1')
  const [callDirection, setCallDirection] = useState<'up' | 'down' | null>(null)
  const [outsideFloor, setOutsideFloor] = useState('F1')
  const [audioLoaded, setAudioLoaded] = useState(false)
  
  const elevatorQueue = useRef<string[]>([])
  const isProcessing = useRef(false)

  // 预加载音频（首次点击时）
  const initAudio = () => {
    if (!audioLoaded) {
      preloadAudio()
      setAudioLoaded(true)
    }
  }

  // 获取楼层数字用于显示
  const getFloorDisplay = (floor: string) => {
    if (floor === 'B2') return '-2'
    if (floor === 'B1') return '-1'
    return floor.replace('F', '')
  }

  // 获取楼层索引
  const getFloorIndex = (floor: string) => FLOORS.indexOf(floor)

  // 处理楼层选择
  const handleFloorSelect = useCallback((floor: string) => {
    initAudio()
    
    if (floor === currentFloor && !isMoving && isDoorOpen) {
      return
    }
    
    if (!selectedFloors.has(floor)) {
      setSelectedFloors(prev => new Set([...prev, floor]))
      elevatorQueue.current.push(floor)
      
      if (!isProcessing.current) {
        processQueue()
      }
    }
  }, [currentFloor, isMoving, isDoorOpen, selectedFloors])

  // 获取楼层中文名
  const getFloorName = (floor: string) => {
    if (floor === 'B2') return '负二楼'
    if (floor === 'B1') return '负一楼'
    return floor.replace('F', '') + '楼'
  }

  // 处理电梯队列
  const processQueue = useCallback(async () => {
    if (isProcessing.current || elevatorQueue.current.length === 0) return
    
    isProcessing.current = true
    
    while (elevatorQueue.current.length > 0) {
      const target = elevatorQueue.current.shift()!
      setTargetFloor(target)
      
      // 关门
      if (isDoorOpen) {
        setIsDoorOpen(false)
        announceDoor('close')
        await delay(1500)
      }
      
      // 确定方向
      const currentIdx = getFloorIndex(currentFloor)
      const targetIdx = getFloorIndex(target)
      const dir = targetIdx > currentIdx ? 'up' : 'down'
      setDirection(dir)
      
      // 播报运行方向
      announceDirection(dir)
      await delay(1000)
      
      // 开始移动
      setIsMoving(true)
      
      // 逐层移动
      const floorsToPass = dir === 'up' 
        ? FLOORS.slice(currentIdx + 1, targetIdx + 1)
        : FLOORS.slice(targetIdx, currentIdx).reverse()
      
      for (const floor of floorsToPass) {
        await delay(1200)
        setCurrentFloor(floor)
        setDisplayFloor(floor)
      }
      
      setIsMoving(false)
      setDirection(null)
      
      // 到达播报
      announceArrival(target)
      await delay(500)
      
      // 开门
      setIsDoorOpen(true)
      announceDoor('open')
      
      // 移除已到达楼层
      setSelectedFloors(prev => {
        const newSet = new Set(prev)
        newSet.delete(target)
        return newSet
      })
      
      await delay(2000)
    }
    
    isProcessing.current = false
    setTargetFloor(null)
  }, [currentFloor, isDoorOpen])

  // 外部召唤电梯
  const handleCallElevator = (dir: 'up' | 'down') => {
    initAudio()
    setCallDirection(dir)
    announceDirection(dir)
    
    if (currentFloor !== outsideFloor || isMoving) {
      elevatorQueue.current.unshift(outsideFloor)
      if (!isProcessing.current) {
        processQueue()
      }
    }
  }

  // 切换视角
  const toggleView = () => {
    initAudio()
    if (currentView === 'inside') {
      setOutsideFloor(currentFloor)
      setCurrentView('outside')
    } else {
      setCurrentView('inside')
    }
  }

  // 外部视角选择楼层
  const handleOutsideFloorSelect = (floor: string) => {
    initAudio()
    setOutsideFloor(floor)
  }

  // 开关门控制
  const handleDoorOpen = () => {
    initAudio()
    if (!isMoving) {
      setIsDoorOpen(true)
      announceDoor('open')
    }
  }

  const handleDoorClose = () => {
    initAudio()
    if (!isMoving) {
      setIsDoorOpen(false)
      announceDoor('close')
    }
  }

  // 延迟函数
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  return (
    <div className="elevator-app">
      {/* 视角切换按钮 */}
      <button className="view-toggle" onClick={toggleView}>
        {currentView === 'inside' ? '🏢 切换到外部' : '🚪 切换到内部'}
      </button>

      {/* 标题 */}
      <h1 className="title">🛗 商场电梯模拟器</h1>

      {/* 内部视角 */}
      {currentView === 'inside' && (
        <div className="inside-view">
          {/* 上部区域：电梯门和显示屏并排 */}
          <div className="top-section">
            {/* 楼层显示屏 - 紧凑版 */}
            <div className="display-panel compact">
              <div className={`floor-display ${isMoving ? 'moving' : ''}`}>
                <span className="display-number">{getFloorDisplay(displayFloor)}</span>
              </div>
              <div className="direction-indicator">
                {direction === 'up' && <span className="arrow up">▲</span>}
                {direction === 'down' && <span className="arrow down">▼</span>}
                {!direction && <span className="arrow">-</span>}
              </div>
            </div>

            {/* 电梯门动画 */}
            <div className="door-container compact">
              <div className={`door left ${isDoorOpen ? 'open' : ''}`}></div>
              <div className={`door right ${isDoorOpen ? 'open' : ''}`}></div>
              <div className="door-window">
                <span>{isDoorOpen ? '开' : '关'}</span>
              </div>
            </div>
          </div>

          {/* 控制面板 - 紧凑版 */}
          <div className="control-panel compact">
            <div className="button-grid compact">
              {FLOORS.slice().reverse().map((floor) => (
                <button
                  key={floor}
                  className={`floor-btn compact ${selectedFloors.has(floor) ? 'active' : ''} ${floor === currentFloor && !isMoving ? 'current' : ''}`}
                  onClick={() => handleFloorSelect(floor)}
                  disabled={isMoving}
                >
                  {floor}
                </button>
              ))}
            </div>
            
            {/* 开关门按钮 */}
            <div className="door-controls compact">
              <button 
                className="door-btn open compact"
                onClick={handleDoorOpen}
                disabled={isMoving || isDoorOpen}
              >
                ◀▶
              </button>
              <button 
                className="door-btn close compact"
                onClick={handleDoorClose}
                disabled={isMoving || !isDoorOpen}
              >
                ▶◀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 外部视角 */}
      {currentView === 'outside' && (
        <div className="outside-view">
          {/* 上部区域：电梯门和显示屏并排 */}
          <div className="top-section">
            {/* 当前楼层显示 - 紧凑版 */}
            <div className="hall-display compact">
              <div className={`hall-floor ${isMoving ? 'moving' : ''}`}>
                {getFloorDisplay(currentFloor)}
              </div>
              <div className="hall-direction">
                {direction === 'up' && <span className="arrow up">▲</span>}
                {direction === 'down' && <span className="arrow down">▼</span>}
                {!direction && <span>-</span>}
              </div>
            </div>

            {/* 电梯门（外部视角） */}
            <div className="elevator-shaft compact">
              <div className="elevator-cabin compact">
                <div className={`cabin-door left ${isDoorOpen ? 'open' : ''}`}></div>
                <div className={`cabin-door right ${isDoorOpen ? 'open' : ''}`}></div>
                <div className="cabin-window">
                  <span>{isDoorOpen ? '开' : '关'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 外部视角楼层选择器 */}
          <div className="outside-floor-selector">
            <p className="selector-label">你在哪一层？</p>
            <div className="floor-selector-grid">
              {FLOORS.map((floor) => (
                <button
                  key={floor}
                  className={`selector-btn ${outsideFloor === floor ? 'active' : ''}`}
                  onClick={() => handleOutsideFloorSelect(floor)}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          {/* 召唤按钮 */}
          <div className="call-panel compact">
            <button 
              className={`call-btn up ${callDirection === 'up' ? 'active' : ''}`}
              onClick={() => handleCallElevator('up')}
            >
              ▲ 上行
            </button>
            <button 
              className={`call-btn down ${callDirection === 'down' ? 'active' : ''}`}
              onClick={() => handleCallElevator('down')}
            >
              ▼ 下行
            </button>
          </div>

          {/* 楼层指示器 */}
          <div className="floor-indicator compact">
            <span>你在: {getFloorName(outsideFloor)} | 电梯在: {getFloorName(currentFloor)}</span>
          </div>
        </div>
      )}

      {/* 状态栏 */}
      <div className="status-bar">
        <span>状态: {isMoving ? '运行中' : isDoorOpen ? '门已开' : '门已关'}</span>
        {targetFloor && <span> | 目标: {targetFloor}</span>}
      </div>
    </div>
  )
}

export default App
