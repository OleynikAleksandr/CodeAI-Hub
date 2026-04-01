# Project Description Questionnaire

> This is the first step: describe your idea in your own words.
> You do not need to know technical details. Write as if you were explaining it to a friend.
> Your answers will be used to create the project description,
> and then you will be able to discuss and refine it together with the agent.
> These answers will also help build a clear diagram of the system modules and boundaries.
>
> We recommend describing the future product in a cluster-module architecture mindset.
> That does not mean you need to know special terms in advance.
> It is enough to describe the product in simple language: which understandable parts it has,
> which large blocks exist, and where the important boundaries are.
> This approach helps the AI understand the product more accurately and build the architecture more carefully.
>
> Rules:
> - Write in simple language.
> - You do not need to know technical terms.
> - If you do not have an answer for a question, leave it empty.
> - If you are unsure which field to use, fill in the closest one or leave it empty. The agent will see the gaps and ask focused follow-up questions later.

---

## 0. Reference Documents (if any)
<small><i>If you already have drafts, notes, specs, or links to similar applications, list them here with file paths or links and a short explanation. If the project starts from scratch, leave this empty.</i></small>

<!-- field:pre_read_documents -->

<!-- /field -->

---

## 1. Project Name
<small><i>What is the name of your project? Use a short, clear title.</i></small>

<!-- field:meta.title -->

<!-- /field -->

---

## 2. Product Type / Platform
<small><i>What kind of product is this? Example: "Web application", "Desktop app", "Mobile application", "VS Code extension", "CLI tool", "Backend service", "I do not know yet". This is a simple question, but it strongly affects the architecture that follows.</i></small>

<!-- field:project.stack -->

<!-- /field -->

---

## 3. What the Project Is About
<small><i>Use 1-3 sentences to explain what the product is and why it is needed. Example: "An application for tracking personal finances. It helps users see where their money goes and plan a budget."</i></small>

<!-- field:short_description -->

<!-- /field -->

---

## 4. Problem and Goal
<small><i>Which problem do you want to solve with this product? What do you want to achieve? Example problem: "I currently track expenses in Excel, which is inconvenient, data gets lost, and there is no clear overview." Example goal: "I want to see all expenses by category for any period and receive a warning when a category budget is exceeded."</i></small>

<!-- field:problem_and_goals -->

<!-- /field -->

---

## 5. Who Will Use the Product
<small><i>Who are the main users? Example: "Only me", "A team of 5 people", "Any internet user", "Small business accountants".</i></small>

<!-- field:users -->

<!-- /field -->

---

## 6. How the Product Should Work
<small><i>Describe the main usage situations: what you or the user does in the product and what result should happen in response. Include as many scenarios as needed to make the product behavior clear. Write in simple language, as if you were explaining it to a friend. Example: "I open the application and see a monthly expense summary. I click 'Add expense', choose a category, and enter an amount. If the food budget is exceeded, I see a red warning."</i></small>

<!-- field:user_scenarios -->

<!-- /field -->

---

## 7. What the Product Must Be Able to Do
<small><i>List the core capabilities, the things without which the product does not make sense. You do not need to describe everything, only the most important parts. The rest can appear in later stages. Example: "add and edit expenses; show statistics by category; warn about budget overruns; export data to PDF."</i></small>

<!-- field:key_functions -->

<!-- /field -->

---

## 8. Which Large Parts the Product May Have (optional)
<small><i>If you already have an idea of the major parts of the system, list them with a short explanation. You do not need classes or low-level technical details here. What matters are the large understandable blocks from which the architecture and diagram can later be built. You can write things like "The surface through which the user enters the system", "A separate runtime", "A separate service", "Integration with an external API", "A background worker". If you do not know yet, leave it empty and the agent will help define the structure later.</i></small>

<!-- field:modules_draft -->

<!-- /field -->

---

## 9. Which Boundaries or Independent Parts Are Already Clear (optional)
<small><i>Are there any parts of the system that you already consider separate and independent? Example: "A separate client and a separate server", "A separate plugin and a separate synchronization service", "A separate shell and a separate core runtime", "A separate admin panel". This helps avoid mixing everything into one unclear structure later. If it is too early, leave it empty.</i></small>

<!-- field:boundaries_draft -->

<!-- /field -->

---

## 10. Important Constraints
<small><i>Are there any constraints or special conditions to keep in mind? Example: "Must work without internet access", "Budget is limited, so no paid services", "Data must not leave the local machine", "Support for Russian and English is required". If there is nothing special, leave it empty.</i></small>

<!-- field:constraints -->

<!-- /field -->

---

## 11. What We Definitely Do Not Build
<small><i>What is outside this project? This helps keep the scope focused and prevents it from spreading. Example: "We do not build a mobile version", "We do not integrate with banks", "We do not add multi-user mode".</i></small>

<!-- field:out_of_scope -->

<!-- /field -->

---

## 12. Notes
<small><i>Any additional details that will help explain the future product.</i></small>

<!-- field:notes -->

<!-- /field -->
