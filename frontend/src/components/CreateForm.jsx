import React from 'react'

export const CreateForm = () => {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-white">
      <h1 className="text-2xl font-bold mb-4">Create Form</h1>
      <p className="mb-6">This is where you can create a new form.</p>
      <form className="w-1/2">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="formName">
            Form Name
          </label>
          <input
            type="text"
            id="formName"
            placeholder="Enter form name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Create Form
        </button>
      </form>
    </div>
  )
}