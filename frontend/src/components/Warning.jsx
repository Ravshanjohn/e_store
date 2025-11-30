

const Warning = () => {
  return (
    <div className='w-full flex justify-center bg-gradient-to-r from-red-900 to-red-800 py-3 px-4 border-b-2 border-red-700 text-center'>
      <div className='flex items-center gap-3 max-w-2xl'>
        <div className='flex-shrink-0'>
          
        </div>
        <p className='text-red-100 text-sm sm:text-base font-medium'>
           Demo Mode: Do not use your real credit card or email address in this demo application. Instead use made-up ones.
        </p>
      </div>
    </div>
  )
}

export default Warning